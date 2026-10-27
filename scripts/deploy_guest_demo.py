"""Package only fixed demo assets and deploy the isolated gateway stack."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile
import boto3

ROOT = Path(__file__).resolve().parents[1]


def package():
    output = ROOT / '.deployment' / 'guest-demo.zip'
    output.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.write(ROOT / 'guest_demo' / 'handler.py', 'handler.py')
        for filename in ('reference.png', 'missing-item.png', 'no-change.jpg', 'blurred.jpg', 'refilled.jpg'):
            archive.write(ROOT / 'fixtures' / 'elevenlabs' / filename, 'assets/elevenlabs/' + filename)
        geometry = json.loads((ROOT / 'fixtures/elevenlabs/regions.json').read_text())
        archive.writestr('assets/elevenlabs/regions.json', json.dumps({'regions': geometry['regions']}))
        for filename in ('reference.png', 'single_gap.jpg', 'multiple_gaps.jpg', 'no_change.jpg',
                         'blur.jpg', 'alignment_failure.jpg', 'occlusion.jpg', 'lighting.jpg', 'refilled.jpg'):
            archive.write(ROOT / 'fixtures/generated/0' / filename, 'assets/procedural/' + filename)
        manifest = json.loads((ROOT / 'fixtures/generated/manifest.json').read_text())
        archive.writestr('assets/procedural/regions.json', json.dumps({'regions': manifest['cases'][0]['regions']}))
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', default='shelfsignal')
    parser.add_argument('--region', default='us-west-2')
    parser.add_argument('--bucket', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    output = package()
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    key = 'guest-demo/' + digest + '.zip'
    session.client('s3').upload_file(str(output), args.bucket, key)
    cf = session.client('cloudformation')
    request = dict(StackName='shelfsignal-guest-demo',
                   TemplateBody=(ROOT / 'infrastructure/guest-demo.yaml').read_text(),
                   Parameters=[{'ParameterKey': 'CodeBucket', 'ParameterValue': args.bucket},
                               {'ParameterKey': 'CodeKey', 'ParameterValue': key}],
                   Capabilities=['CAPABILITY_IAM'])
    try:
        cf.describe_stacks(StackName=request['StackName'])
    except cf.exceptions.ClientError as exc:
        if 'does not exist' not in str(exc):
            raise
        cf.create_stack(**request)
        print('Guest demo stack creation started.', flush=True)
    else:
        cf.update_stack(**request)
        print('Guest demo stack update started.', flush=True)
    # Check progress separately; no unbounded wait in the deployment command.
    print('Package SHA256: ' + digest)


if __name__ == '__main__':
    main()
