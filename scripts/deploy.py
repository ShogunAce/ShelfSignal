"""Build and update the existing ShelfSignal stack; upload only allowlisted source files."""
import argparse
import hashlib
import json
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', default='shelfsignal')
    parser.add_argument('--region', default='us-west-2')
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    cf, cb, s3, ecr = [session.client(s) for s in ('cloudformation','codebuild','s3','ecr')]
    account = session.client('sts').get_caller_identity()['Account']
    try:
        cf.describe_stacks(StackName='shelfsignal')
        change_type='UPDATE'
    except ClientError as exc:
        if exc.response['Error']['Code']!='ValidationError' or 'does not exist' not in exc.response['Error']['Message']:raise
        change_type='CREATE'
    project = cb.batch_get_projects(names=['shelfsignal-build'])['projects'][0]
    if project['source']['type'] != 'S3':
        raise RuntimeError('Expected the existing S3-backed ShelfSignal build project')
    build_bucket = project['source']['location'].split('/')[0]
    folder = ROOT / '.deployment'; folder.mkdir(exist_ok=True)
    archive = folder / 'source.zip'
    # Keep data, secrets, environment files, and caches out of AWS build inputs.
    files = [ROOT / name for name in ('requirements.txt','requirements.lock.txt','pytest.ini')]
    for directory in ('backend','fixtures/generator','infrastructure'):
        files.extend(p for p in (ROOT / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and (p.suffix in {'.py','.yml','.yaml'} or p.name=='Dockerfile'))
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(set(files)): z.write(p,p.relative_to(ROOT).as_posix())
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    tag='build-'+digest[:16]
    source_key=f'sources/{tag}.zip'
    s3.upload_file(str(archive),build_bucket,source_key,ExtraArgs={'ServerSideEncryption':'AES256'})
    build=cb.start_build(projectName='shelfsignal-build',sourceLocationOverride=f'{build_bucket}/{source_key}',environmentVariablesOverride=[{'name':'IMAGE_TAG','value':tag,'type':'PLAINTEXT'}])['build']
    print('AWS CodeBuild started:',build['id'],flush=True)
    deadline=time.monotonic()+1200
    last_phase=None
    while build['buildStatus']=='IN_PROGRESS':
        if time.monotonic()>deadline:raise TimeoutError('Build deadline exceeded; inspect CodeBuild before retrying')
        time.sleep(10)
        build=cb.batch_get_builds(ids=[build['id']])['builds'][0]
        phase=build.get('currentPhase')
        if phase!=last_phase:print('Build phase:',phase,flush=True);last_phase=phase
    if build['buildStatus']!='SUCCEEDED':
        raise RuntimeError('Build failed: '+json.dumps({'status':build['buildStatus'],'phases':build.get('phases',[]),'logs':build.get('logs',{})},default=str))
    image_digest=ecr.describe_images(repositoryName='shelfsignal',imageIds=[{'imageTag':tag}])['imageDetails'][0]['imageDigest']
    uri=f'{account}.dkr.ecr.{args.region}.amazonaws.com/shelfsignal@{image_digest}'
    change='update-'+tag
    cf.create_change_set(StackName='shelfsignal',ChangeSetName=change,ChangeSetType=change_type,TemplateBody=(ROOT/'infrastructure/template.yaml').read_text(),Parameters=[{'ParameterKey':'ImageUri','ParameterValue':uri}],Capabilities=['CAPABILITY_IAM','CAPABILITY_AUTO_EXPAND'])
    cf.get_waiter('change_set_create_complete').wait(StackName='shelfsignal',ChangeSetName=change,WaiterConfig={'Delay':5,'MaxAttempts':60})
    changes=cf.describe_change_set(StackName='shelfsignal',ChangeSetName=change)
    print('Change set:',json.dumps([c['ResourceChange'] for c in changes['Changes']]),flush=True)
    cf.execute_change_set(StackName='shelfsignal',ChangeSetName=change)
    print('Updating Lambda container through CloudFormation',flush=True)
    cf.get_waiter('stack_update_complete' if change_type=='UPDATE' else 'stack_create_complete').wait(StackName='shelfsignal',WaiterConfig={'Delay':10,'MaxAttempts':90})
    output={o['OutputKey']:o['OutputValue'] for o in cf.describe_stacks(StackName='shelfsignal')['Stacks'][0]['Outputs']}
    record={'verified_at':datetime.now(timezone.utc).isoformat(),'account':account,'region':args.region,'stack':'shelfsignal','image_uri':uri,'source_sha256':digest,'build_id':build['id'],'build_status':build['buildStatus'],'outputs':output,'runtime_smoke_test':'not yet run'}
    (ROOT/'docs/evidence/deployment.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
    print(json.dumps(record,indent=2),flush=True)


if __name__=='__main__':main()
