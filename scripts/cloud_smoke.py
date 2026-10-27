"""Exercise the actual authenticated loopback-to-Lambda proxy and verify private storage."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import boto3
import httpx

ROOT=Path(__file__).resolve().parents[1]


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--profile',default='shelfsignal')
    p.add_argument('--region',default='us-west-2')
    p.add_argument('--base-url',default='http://127.0.0.1:8000')
    args=p.parse_args()
    session=boto3.Session(profile_name=args.profile,region_name=args.region)
    outputs={o['OutputKey']:o['OutputValue'] for o in session.client('cloudformation').describe_stacks(StackName='shelfsignal')['Stacks'][0]['Outputs']}
    s3,ddb,lam=[session.client(s) for s in ('s3','dynamodb','lambda')]
    manifest=json.loads((ROOT/'fixtures/generated/manifest.json').read_text())
    regions=manifest['cases'][0]['regions']
    with httpx.Client(base_url=args.base_url,timeout=60) as client:
        def get(path):
            r=client.get(path);r.raise_for_status();return r.json()
        def post(path,body=None):
            r=client.post(path,json=body or {});r.raise_for_status();return r.json()
        def upload(prefix,kind,name):
            raw=(ROOT/'fixtures/generated/0'/name).read_bytes()
            r=client.post(prefix+'/'+kind,files={'file':(name,raw)});r.raise_for_status();return r.json()
        version=get('/version')
        assert version['runtime']=='AWS Lambda' and version['opencv'].split('.')[0]=='5' and version['architecture']=='x86_64',version
        unsigned=httpx.get(outputs['FunctionUrl']+'health',timeout=30)
        assert unsigned.status_code==403,unsigned.status_code
        assert lam.get_function_url_config(FunctionName=outputs['FunctionName'])['AuthType']=='AWS_IAM'
        runs=[]
        for case,expected,followups in [
            ('single_gap','APPROVAL_REQUIRED',[('still_empty','UNRESOLVED'),('blur','INCONCLUSIVE'),('refilled','VERIFIED_VISUALLY')]),
            ('no_change','EVIDENCE_READY',[]),('blur','RESCAN_REQUIRED',[]),('alignment_failure','RESCAN_REQUIRED',[])]:
            item=post('/inspections');prefix='/inspections/'+item['id']
            upload(prefix,'reference','reference.png');upload(prefix,'image',case+'.jpg')
            post(prefix+'/regions',{'regions':regions})
            item=post(prefix+'/analyze');assert item['state']==expected,item['state']
            print(case,item['state'],flush=True)
            assert item['task'] is None
            if followups:
                item=post(prefix+'/approval',{'approved':True})
                assert item['task']['physical_completion'] is False
                assert post(prefix+'/approval',{'approved':True})['task']['id']==item['task']['id']
                for follow,outcome in followups:
                    upload(prefix,'followup',follow+'.jpg');item=post(prefix+'/verify')
                    assert item['state']==outcome,(follow,item['state'])
                    print(follow,item['state'],flush=True)
            row=ddb.get_item(TableName=outputs['InspectionTable'],Key={'id':{'S':item['id']}},ConsistentRead=True)['Item']
            persisted=json.loads(s3.get_object(Bucket=outputs['ImageBucket'],Key=row['body_key']['S'])['Body'].read())
            assert persisted==get(prefix)==item
            for metadata in item['image_history']:
                raw=s3.get_object(Bucket=outputs['ImageBucket'],Key=metadata['key'])['Body'].read()
                assert hashlib.sha256(raw).hexdigest()==metadata['sha256']
            image=client.get(prefix+'/media/reference');image.raise_for_status()
            assert image.content==(ROOT/'fixtures/generated/0/reference.png').read_bytes()
            runs.append(item)
        # Create idempotency passes through the proxy as well as local mode.
        import uuid
        key=str(uuid.uuid4())
        a=client.post('/inspections',json={},headers={'Idempotency-Key':key});a.raise_for_status()
        b=client.post('/inspections',json={},headers={'Idempotency-Key':key});b.raise_for_status()
        assert a.json()==b.json()
    protection=s3.get_public_access_block(Bucket=outputs['ImageBucket'])['PublicAccessBlockConfiguration']
    assert all(protection.values())
    function=lam.get_function(FunctionName=outputs['FunctionName'])
    deployed=json.loads((ROOT/'docs/evidence/deployment.json').read_text())
    assert function['Code']['ResolvedImageUri']==deployed['image_uri']
    ttl=ddb.describe_time_to_live(TableName=outputs['InspectionTable'])['TimeToLiveDescription']
    assert ttl['TimeToLiveStatus']=='ENABLED'
    lifecycle=s3.get_bucket_lifecycle_configuration(Bucket=outputs['ImageBucket'])['Rules']
    assert any(r.get('Expiration',{}).get('Days')==30 for r in lifecycle)
    record={'verified_at':datetime.now(timezone.utc).isoformat(),'runtime':version,'image_uri':function['Code']['ResolvedImageUri'],'outputs':outputs,'unsigned_http_status':unsigned.status_code,'s3_public_access_block':protection,'ddb_ttl':ttl,'s3_lifecycle':lifecycle,'original_hashes_verified':True,'ddb_s3_trace_roundtrip_verified':True,'proxy_idempotency_verified':True,'runs':runs}
    (ROOT/'docs/evidence/aws-smoke.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
    deployed['runtime_smoke_test']='passed'
    deployed['runtime_smoke_verified_at']=record['verified_at']
    (ROOT/'docs/evidence/deployment.json').write_text(json.dumps(deployed,indent=2),encoding='utf-8')
    print('AWS smoke passed; persisted evidence: docs/evidence/aws-smoke.json',flush=True)


if __name__=='__main__':main()
