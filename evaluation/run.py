import json, time
from pathlib import Path
import numpy as np
from backend.app.vision import analyze

def run():
    data=json.loads(Path('fixtures/generated/manifest.json').read_text());rows=[]
    for case in data['cases']:
        result,overlay=analyze(Path(case['reference']).read_bytes(),Path(case['image']).read_bytes(),case['regions'])
        actual={c['id'] for c in result['candidates']} if result['quality_ok'] else set();expected=set(case['missing'])
        decision='RESCAN_REQUIRED' if not result['quality_ok'] else ('APPROVAL_REQUIRED' if actual else 'EVIDENCE_READY')
        rows.append({'seed':case['seed'],'kind':case['kind'],'tp':len(actual&expected),'fp':len(actual-expected),'fn':len(expected-actual),'decision':decision,'expected_decision':case['decision'],'branch_correct':decision==case['decision'],'duration_ms':result['duration_ms'],'quality_ok':result['quality_ok'],'diagnostics':result['diagnostics']})
        if case['seed']==0:
            Path('docs/evidence').mkdir(parents=True,exist_ok=True)
            Path(f'docs/evidence/{case["kind"]}.png').write_bytes(overlay)
    tp,fp,fn=[sum(r[k] for r in rows) for k in ('tp','fp','fn')]
    summary={'synthetic':True,'sample_count':len(rows),'seeds':8,'true_positives':tp,'false_positives':fp,'false_negatives':fn,'precision':tp/max(1,tp+fp),'recall':tp/max(1,tp+fn),'median_latency_ms':float(np.median([r['duration_ms'] for r in rows])),'p95_latency_ms':float(np.percentile([r['duration_ms'] for r in rows],95)),'branch_accuracy':sum(r['branch_correct'] for r in rows)/len(rows),'quality_accepted':sum(r['quality_ok'] for r in rows),'region_overlap_note':'Predictions classify operator-defined regions; IoU is 1 for matched position IDs by construction, not an independent localization metric.','limitations':'Synthetic fixtures do not establish real-store performance.'}
    verification=[]
    for seed in range(8):
        case=next(c for c in data['cases'] if c['seed']==seed and c['kind']=='single_gap')
        before,_=analyze(Path(case['reference']).read_bytes(),Path(case['image']).read_bytes(),case['regions'])
        ids={c['id'] for c in before['candidates']}
        for kind,expected in [('refilled','VERIFIED_VISUALLY'),('still_empty','UNRESOLVED'),('blur','INCONCLUSIVE')]:
            follow=next(c for c in data['cases'] if c['seed']==seed and c['kind']==kind)
            evidence,_=analyze(Path(follow['reference']).read_bytes(),Path(follow['image']).read_bytes(),follow['regions'])
            original=[r for r in evidence['regions'] if r['id'] in ids]
            outcome='INCONCLUSIVE' if not evidence['quality_ok'] or len(original)!=len(ids) else ('VERIFIED_VISUALLY' if all(not r['gap'] and not r['ambiguous'] and r['score']<.25 for r in original) else 'UNRESOLVED')
            verification.append({'seed':seed,'kind':kind,'expected':expected,'outcome':outcome,'correct':outcome==expected})
    summary['verification_samples']=len(verification)
    summary['verification_accuracy']=sum(r['correct'] for r in verification)/len(verification)
    summary['inconclusive_correct']=sum(r['correct'] for r in verification if r['kind']=='blur')
    summary['alignment_rejections']=sum(r['kind']=='alignment_failure' and not r['quality_ok'] for r in rows)
    Path('evaluation/verification.json').write_text(json.dumps(verification,indent=2))
    Path('evaluation/results.json').write_text(json.dumps({'summary':summary,'cases':rows},indent=2))
    import csv
    with open('evaluation/results.csv','w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=[k for k in rows[0] if k!='diagnostics']);writer.writeheader();writer.writerows([{k:v for k,v in r.items() if k!='diagnostics'} for r in rows])
    print(json.dumps(summary,indent=2))
if __name__=='__main__':run()
