"""Check executed release evidence; do not substitute plans for a passing artifact."""
import hashlib
import json
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import cv2

ROOT=Path(__file__).resolve().parents[1]


def main():
    def read(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
    assert cv2.__version__.split('.')[0]=='5','OpenCV 5 required'
    documents=['README','ARCHITECTURE','TECHNICAL_REPORT','EVALUATION','LIMITATIONS','SECURITY','DEPLOYMENT','TESTING','DEMO_SCRIPT','DEVPOST_SUBMISSION','BUILD_REVIEW']
    assert all((ROOT/(n+'.md')).is_file() for n in documents),'Missing submission document'
    suite=ET.parse(ROOT/'docs/evidence/pytest.xml').getroot().find('testsuite')
    assert suite is not None and int(suite.attrib['tests'])>=19
    assert int(suite.attrib['failures'])==int(suite.attrib['errors'])==0
    browser={}
    for name in ('playwright','playwright-aws'):
        stats=read('docs/evidence/'+name+'.json')['stats']
        assert stats['expected']>=6 and stats['unexpected']==stats['flaky']==stats['skipped']==0,name
        browser[name]=stats
    summary=read('evaluation/results.json')['summary']
    assert summary['synthetic'] and summary['sample_count']==88 and summary['verification_samples']==24
    cloud=read('docs/evidence/aws-smoke.json');deployment=read('docs/evidence/deployment.json')
    assert cloud['runtime']['runtime']=='AWS Lambda' and cloud['runtime']['opencv'].split('.')[0]=='5'
    assert cloud['image_uri']==deployment['image_uri'] and deployment['runtime_smoke_test']=='passed'
    assert cloud['unsigned_http_status']==403 and cloud['original_hashes_verified'] and cloud['ddb_s3_trace_roundtrip_verified']
    states={event['decision'] for run in cloud['runs'] for event in run['events']}
    assert {'APPROVAL_REQUIRED','TASK_APPROVED','VERIFIED_VISUALLY','UNRESOLVED','INCONCLUSIVE','RESCAN_REQUIRED','EVIDENCE_READY'}<=states
    # Prove that the local runtime source still matches the package actually deployed.
    archive=ROOT/'.deployment/source.zip'
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==deployment['source_sha256']
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            if name.startswith('backend/') or name in {'requirements.lock.txt','requirements.txt'}:
                assert z.read(name)==(ROOT/name).read_bytes(),'Local source changed since deployment: '+name
    assert (ROOT/'frontend/dist/index.html').is_file()
    report={'checked_at':datetime.now(timezone.utc).isoformat(),'engineering_gates_A_to_F':'passed','submission_documents':len(documents),'pytest_passed':int(suite.attrib['tests']),'browser':browser,'synthetic_evaluation':summary,'aws_runtime':cloud['runtime'],'cloud_image_uri':cloud['image_uri'],'local_runtime_matches_deployed_archive':True,'manual_submission_remaining':['record and upload demo video','publish or attach source','arrange judge access','complete competition portal entry'],'competition_submitted':False}
    (ROOT/'docs/evidence/release-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
