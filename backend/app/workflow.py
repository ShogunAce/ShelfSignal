import time, uuid
from datetime import datetime, timezone
from .vision import analyze

TRANSITIONS={
'CREATED':{'ANALYZING'},'ANALYZING':{'EVIDENCE_READY','FAILED'},
'EVIDENCE_READY':{'APPROVAL_REQUIRED','RESCAN_REQUIRED'},
'RESCAN_REQUIRED':{'ANALYZING'},'APPROVAL_REQUIRED':{'TASK_APPROVED','TASK_REJECTED'},
'TASK_APPROVED':{'VERIFICATION_PENDING'},'VERIFICATION_PENDING':{'VERIFIED_VISUALLY','UNRESOLVED','INCONCLUSIVE','FAILED'},
'UNRESOLVED':{'VERIFICATION_PENDING'},'INCONCLUSIVE':{'VERIFICATION_PENDING'},
'FAILED':{'ANALYZING'},'TASK_REJECTED':set(),'VERIFIED_VISUALLY':set()}

def create(repo,key=None):
    item={'id':key or str(uuid.uuid4()),'revision':0,'state':'CREATED','images':{},'image_history':[],'regions':[],'analysis':None,'candidates':[],'events':[],'task':None,'verification':None,'expires':int(time.time())+30*86400}
    event(repo,item,'create_inspection','operator_started','Inspection created')
    return item

def event(repo,item,tool,rule,result,features=None,next_state=None,error=None):
    previous_state=item['state']
    if next_state:
        if next_state not in TRANSITIONS.get(item['state'],set()): raise ValueError(f'Illegal transition {item["state"]} to {next_state}')
        item['state']=next_state
    item['events'].append({'event_id':str(uuid.uuid4()),'inspection_id':item['id'],'timestamp':datetime.now(timezone.utc).isoformat(),'tool':tool,'input_references':dict(item['images']),'observed_features':features or {},'previous_state':previous_state,'decision':item['state'],'policy_rule':rule,'model_invocation':'disabled','result':result,'runtime_ms':(features or {}).get('duration_ms',0),'error':error})
    repo.save(item)

def decide(repo,item):
    if item['state']!='EVIDENCE_READY': return item
    evidence=item['analysis']
    if not evidence: raise ValueError('Analyze images first')
    if not evidence['quality_ok']:
        event(repo,item,'request_rescan','unreliable_evidence',evidence['reason'],next_state='RESCAN_REQUIRED')
    elif evidence['candidates']:
        event(repo,item,'propose_restock_task','occupancy_loss_requires_human_review','Review the marked positions before approving a restock task.',next_state='APPROVAL_REQUIRED')
    return item

def run_analysis(repo,item):
    if item['state'] not in {'CREATED','RESCAN_REQUIRED','FAILED'}: return item
    if not all(k in item['images'] for k in ('reference','image')) or not item['regions']: raise ValueError('Reference, inspection image and expected positions are required')
    if len(item['events'])>150: raise ValueError('Inspection retry limit reached; create a new inspection')
    event(repo,item,'analyze_shelf','begin_analysis','Analysis started',next_state='ANALYZING')
    try:
        evidence,overlay=analyze(repo.image(item['images']['reference']),repo.image(item['images']['image']),item['regions'])
        key=f'{item["id"]}/{uuid.uuid4()}/overlay.png';repo.put_image(key,overlay);item['images']['overlay']=key
        item['analysis']=evidence;item['candidates']=evidence['candidates']
        event(repo,item,'assess_evidence_quality','opencv_quality_gate',evidence['reason'],evidence,next_state='EVIDENCE_READY')
        return decide(repo,item)
    except Exception as exc:
        if item['state']=='ANALYZING': event(repo,item,'analyze_shelf','processing_error','Analysis failed',next_state='FAILED',error=type(exc).__name__)
        raise

def approve(repo,item,approved):
    if item['state'] in {'TASK_APPROVED','TASK_REJECTED'}:
        if approved==(item['state']=='TASK_APPROVED'): return item
        raise ValueError('Decision already recorded')
    if item['state']!='APPROVAL_REQUIRED': raise ValueError('No proposal is awaiting approval')
    if approved: item['task']={'id':str(uuid.uuid4()),'positions':[c['id'] for c in item['candidates']],'status':'APPROVED','physical_completion':False}
    event(repo,item,'approve_or_reject_task','human_decision','Approved by operator' if approved else 'Rejected by operator',next_state='TASK_APPROVED' if approved else 'TASK_REJECTED')
    return item

def verify(repo,item):
    if item['state']=='VERIFIED_VISUALLY': return item
    if item['state'] not in {'TASK_APPROVED','UNRESOLVED','INCONCLUSIVE'} or 'followup' not in item['images']: raise ValueError('Approved task and follow-up photograph required')
    if len(item['events'])>150: raise ValueError('Inspection retry limit reached')
    event(repo,item,'compare_followup','begin_verification','Comparing original candidate positions',next_state='VERIFICATION_PENDING')
    try:
        evidence,overlay=analyze(repo.image(item['images']['reference']),repo.image(item['images']['followup']),item['regions'])
        original={c['id']:c for c in item['candidates']}
        compared=[{'id':r['id'],'before':original[r['id']]['score'],'after':r['score'],'resolved':not r['gap'] and not r['ambiguous'] and r['score']<.25,'features':r} for r in evidence['regions'] if r['id'] in original]
        outcome='INCONCLUSIVE' if not evidence['quality_ok'] or len(compared)!=len(original) else ('VERIFIED_VISUALLY' if all(c['resolved'] for c in compared) else 'UNRESOLVED')
        item['verification']={'outcome':outcome,'regions':compared,'evidence':evidence,'physical_completion_claimed':False}
        key=f'{item["id"]}/{uuid.uuid4()}/verification.png';repo.put_image(key,overlay);item['images']['verification']=key
        event(repo,item,'finalize_verification','original_region_comparison',outcome,evidence,next_state=outcome)
    except Exception as exc:
        if item['state']=='VERIFICATION_PENDING':
            item['verification']={'outcome':'INCONCLUSIVE','regions':[],'evidence':None,'physical_completion_claimed':False}
            event(repo,item,'finalize_verification','processing_error','Verification failed; retry with a follow-up photograph.',next_state='INCONCLUSIVE',error=type(exc).__name__)
        raise
    return item
