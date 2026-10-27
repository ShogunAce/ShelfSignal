"""Independent deterministic synthetic benchmark generator."""
import json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path('fixtures/generated')

def generate(count=8):
    ROOT.mkdir(parents=True,exist_ok=True)
    manifest=[]
    for seed in range(count):
        rng=np.random.default_rng(7200+seed)
        canvas=np.full((600,960,3),205,np.uint8)
        noise=rng.integers(-12,13,canvas.shape,dtype=np.int16)
        canvas=np.clip(canvas.astype(np.int16)+noise,0,255).astype(np.uint8)
        regions=[]
        for row in range(3):
            cv2.rectangle(canvas,(15,175+row*190),(945,190+row*190),(65,75,80),-1)
            for col in range(6):
                x,y=35+col*150,25+row*190
                regions.append({'id':f'R{row+1}-{col+1}','box':[x/960,y/600,115/960,140/600]})
                cv2.putText(canvas,f'{seed}-{row}-{col} $2.49',(x,188+row*190),cv2.FONT_HERSHEY_SIMPLEX,.35,(15,15,15),1)
        background=canvas.copy()
        for r in regions:
            x,y,w,h=[int(round(v*s)) for v,s in zip(r['box'],[960,600,960,600])]
            color=tuple(int(v) for v in rng.integers(35,185,3))
            cv2.rectangle(canvas,(x+2,y+2),(x+w-2,y+h-2),color,-1)
            cv2.rectangle(canvas,(x+12,y+25),(x+w-12,y+100),(235,235,230),-1)
            for k in range(9):
                cv2.line(canvas,(x+18,y+35+k*6),(x+int(rng.integers(55,95)),y+35+k*6),(30,30,30),2)
            cv2.putText(canvas,f'{seed}{r["id"]}',(x+10,y+122),cv2.FONT_HERSHEY_SIMPLEX,.5,(255,255,255),1)
        folder=ROOT/str(seed);folder.mkdir(exist_ok=True)
        cv2.imwrite(str(folder/'reference.png'),canvas)
        for kind in ['no_change','single_gap','multiple_gaps','refilled','still_empty','blur','alignment_failure','occlusion','lighting','angle','flat_occlusion']:
            im=canvas.copy(); missing=[]
            if kind in ['single_gap','multiple_gaps','still_empty','angle']:
                missing=[regions[7]['id']] if kind!='multiple_gaps' else [regions[i]['id'] for i in (2,7,15)]
                for r in regions:
                    if r['id'] in missing:
                        x,y,w,h=[int(round(v*s)) for v,s in zip(r['box'],[960,600,960,600])]
                        im[y:y+h,x:x+w]=background[y:y+h,x:x+w]
            if kind=='blur': im=cv2.GaussianBlur(im,(41,41),15)
            if kind=='alignment_failure': im=rng.integers(0,256,im.shape,dtype=np.uint8)
            if kind=='occlusion':
                cv2.rectangle(im,(300,190),(630,390),(40,90,160),-1)
                for j in range(15): cv2.line(im,(300,195+j*13),(630,195+j*13),(220,200,170),4)
            if kind=='flat_occlusion':
                r=regions[7];x,y,w,h=[int(round(v*s)) for v,s in zip(r['box'],[960,600,960,600])]
                cv2.rectangle(im,(x,y),(x+w-1,y+h-1),(100,100,100),-1)
            if kind=='lighting': im=np.clip(im.astype(float)*.73,0,255).astype(np.uint8)
            if kind=='angle': im=cv2.warpAffine(im,cv2.getRotationMatrix2D((480,300),1.2,1),(960,600),borderMode=cv2.BORDER_REFLECT)
            path=folder/f'{kind}.jpg';cv2.imwrite(str(path),im,[cv2.IMWRITE_JPEG_QUALITY,88])
            manifest.append({'seed':seed,'kind':kind,'reference':str(folder/'reference.png'),'image':str(path),'regions':regions,'missing':missing,'decision':'RESCAN_REQUIRED' if kind in ['blur','alignment_failure','occlusion','flat_occlusion'] else ('APPROVAL_REQUIRED' if missing else 'EVIDENCE_READY')})
    (ROOT/'manifest.json').write_text(json.dumps({'synthetic':True,'generator':'1.0','seed_base':7200,'cases':manifest},indent=2))
    return manifest
if __name__=='__main__': generate()
