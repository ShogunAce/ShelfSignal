import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend.app import main, workflow
from backend.app.storage import LocalRepository, Conflict
from backend.app.vision import decode, analyze
from fixtures.generator.generate import generate

@pytest.fixture(scope='session')
def cases():
    if not Path('fixtures/generated/manifest.json').exists():generate()
    return json.loads(Path('fixtures/generated/manifest.json').read_text())['cases']
@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(main,'repo',LocalRepository(tmp_path));main.rate.clear()
    return TestClient(main.app)
def setup(client,cases,kind='single_gap'):
    case=next(c for c in cases if c['seed']==0 and c['kind']==kind)
    i=client.post('/inspections',json={}).json();p='/inspections/'+i['id']
    assert client.post(p+'/reference',files={'file':('r.png',Path(case['reference']).read_bytes())}).status_code==200
    assert client.post(p+'/image',files={'file':('i.jpg',Path(case['image']).read_bytes())}).status_code==200
    assert client.post(p+'/regions',json={'regions':case['regions']}).status_code==200
    return p

def test_closed_loop(client,cases):
    p=setup(client,cases)
    assert client.post(p+'/verify',json={}).status_code==422
    i=client.post(p+'/analyze',json={}).json();assert i['state']=='APPROVAL_REQUIRED';assert i['task'] is None
    assert client.post(p+'/image',files={'file':('a',b'bad')}).status_code==409
    i=client.post(p+'/approval',json={'approved':True}).json();assert i['state']=='TASK_APPROVED';assert i['task']['physical_completion'] is False
    same=client.post(p+'/approval',json={'approved':True}).json();assert same['task']['id']==i['task']['id']
    assert client.post(p+'/followup',files={'file':('refill.jpg',Path('fixtures/generated/0/refilled.jpg').read_bytes())}).status_code==200
    result=client.post(p+'/verify',json={}).json();assert result['state']=='VERIFIED_VISUALLY'
    assert result['verification']['physical_completion_claimed'] is False
    assert client.get(p+'/events').json()[-1]['tool']=='finalize_verification'
    assert client.get(p+'/media/overlay').headers['content-type']=='image/png'
    Path('docs/evidence/local-closed-loop.json').write_text(json.dumps(result,indent=2))
@pytest.mark.parametrize('kind,state,tool',[('no_change','EVIDENCE_READY','assess_evidence_quality'),('single_gap','APPROVAL_REQUIRED','propose_restock_task'),('blur','RESCAN_REQUIRED','request_rescan'),('alignment_failure','RESCAN_REQUIRED','request_rescan'),('occlusion','RESCAN_REQUIRED','request_rescan'),('lighting','EVIDENCE_READY','assess_evidence_quality')])
def test_vision_drives_tools(client,cases,kind,state,tool):
    p=setup(client,cases,kind);result=client.post(p+'/analyze',json={}).json()
    assert result['state']==state,result
    assert result['events'][-1]['tool']==tool
@pytest.mark.parametrize('follow,outcome',[('still_empty','UNRESOLVED'),('blur','INCONCLUSIVE')])
def test_verification_branches(client,cases,follow,outcome):
    p=setup(client,cases);client.post(p+'/analyze',json={});client.post(p+'/approval',json={'approved':True})
    client.post(p+'/followup',files={'file':('f.jpg',Path(f'fixtures/generated/0/{follow}.jpg').read_bytes())})
    assert client.post(p+'/verify',json={}).json()['state']==outcome

def test_reject_and_gating(client,cases):
    p=setup(client,cases);assert client.post(p+'/approval',json={'approved':True}).status_code==422
    client.post(p+'/analyze',json={});i=client.post(p+'/approval',json={'approved':False}).json()
    assert i['task'] is None and i['state']=='TASK_REJECTED'
    assert client.post(p+'/verify',json={}).status_code==422

def test_validation(client,cases):
    p=setup(client,cases)
    assert client.post(p+'/reference',files={'file':('bad.jpg',b'invalid')}).status_code==422
    assert client.post(p+'/regions',json={'regions':[{'id':'x','box':[.9,.1,.5,.5]}]}).status_code==422
    assert client.post(p+'/regions',json={'regions':[{'id':'x','box':[0,0,.5,.5]}]*2}).status_code==422
    assert client.get('/inspections/not-an-id').status_code==404
    assert client.post('/inspections',headers={'Origin':'https://evil.example'},json={}).status_code==403
    with pytest.raises(ValueError):decode(b'x'*(8*1024*1024+1))

def test_persistence_and_conflict(tmp_path):
    r=LocalRepository(tmp_path);i=workflow.create(r);a=r.get(i['id']);b=r.get(i['id']);r.save(a)
    with pytest.raises(Conflict):r.save(b)
    assert LocalRepository(tmp_path).get(i['id'])==a
    with pytest.raises(ValueError):workflow.event(r,a,'test','bad','bad',next_state='VERIFIED_VISUALLY')

def test_release_version(client):assert client.get('/version').json()['opencv'].startswith('5.')

def test_idempotency(client):
    import uuid
    key=str(uuid.uuid4());a=client.post('/inspections',headers={'Idempotency-Key':key},json={}).json();b=client.post('/inspections',headers={'Idempotency-Key':key},json={}).json();assert a==b

def test_original_history_and_capture_overlay(client,cases):
    p=setup(client,cases,'blur')
    old=client.get(p).json()['images']['image']
    client.post(p+'/analyze',json={})
    raw=Path('fixtures/generated/0/single_gap.jpg').read_bytes()
    item=client.post(p+'/image',files={'file':('new.jpg',raw)}).json()
    assert 'overlay' not in item['images']
    assert len(item['image_history'])==3
    assert main.repo.image(old)==Path('fixtures/generated/0/blur.jpg').read_bytes()
    assert item['events'][0]['tool']=='create_inspection'
    assert item['events'][-1]['input_references']['image']==item['images']['image']
    assert client.post(p+'/analyze',json={}).json()['state']=='APPROVAL_REQUIRED'

def test_verification_failure_preserves_approval_retry(client,cases,monkeypatch):
    p=setup(client,cases);client.post(p+'/analyze',json={})
    task=client.post(p+'/approval',json={'approved':True}).json()['task']
    client.post(p+'/followup',files={'file':('f.jpg',Path('fixtures/generated/0/refilled.jpg').read_bytes())})
    original=workflow.analyze
    def unavailable(*args):raise ValueError('Temporary processing failure')
    monkeypatch.setattr(workflow,'analyze',unavailable)
    assert client.post(p+'/verify',json={}).status_code==422
    failed=client.get(p).json()
    assert failed['state']=='INCONCLUSIVE' and failed['task']==task
    assert failed['events'][-1]['error']=='ValueError'
    monkeypatch.setattr(workflow,'analyze',original)
    assert client.post(p+'/verify',json={}).json()['state']=='VERIFIED_VISUALLY'

def test_proxy_preserves_idempotency(client,monkeypatch):
    from backend.app import proxy
    calls=[]
    def fake_invoke(*args):
        calls.append(args)
        return {'statusCode':200,'body':'{}'}
    monkeypatch.setenv('CLOUD_FUNCTION','unit-test')
    monkeypatch.setattr(proxy,'invoke',fake_invoke)
    assert client.post('/inspections',json={},headers={'Idempotency-Key':'test-key'}).status_code==200
    assert calls[0][-1]=='test-key'

def test_proxy_failure_never_runs_local(client,monkeypatch):
    from backend.app import proxy
    def unavailable(*args):raise RuntimeError('offline')
    monkeypatch.setenv('CLOUD_FUNCTION','unit-test')
    monkeypatch.setattr(proxy,'invoke',unavailable)
    assert client.post('/inspections',json={}).status_code==503

def test_cloud_large_trace_uses_immutable_s3_pointer(monkeypatch):
    from backend.app.storage import CloudRepository
    class DDB:
        def put_item(self,**args):self.item=args['Item']
        def get_item(self,**args):return {'Item':self.item}
    repo=object.__new__(CloudRepository);repo.table='test';repo.ddb=DDB();objects={}
    repo.put_image=lambda key,body:objects.__setitem__(key,body)
    repo.image=lambda key:objects[key]
    item=workflow.create(repo)
    workflow.event(repo,item,'test','large_trace','x'*450000)
    assert 'body' not in repo.ddb.item
    assert len(json.dumps(repo.ddb.item))<1000
    assert len(objects)==2 and repo.get(item['id'])==item
