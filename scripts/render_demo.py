"""Render explanation cards and assemble real AWS browser footage with local narration."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'docs/submission/video'
OUT=ROOT/'docs/demo'
INK='#142534'; BLUE='#1677A3'; GRAY='#61727F'; BG='#F7F9FB'; GREEN='#23856B'; AMBER='#A96916'


def font(size,bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',size)


def wrapped(draw,text,xy,width,size=36,color=INK,bold=False):
    x,y=xy;face=font(size,bold);line=''
    for word in text.split():
        candidate=(line+' '+word).strip()
        if draw.textlength(candidate,font=face)>width and line:
            draw.text((x,y),line,font=face,fill=color);y+=int(size*1.5);line=word
        else:line=candidate
    if line:draw.text((x,y),line,font=face,fill=color);y+=int(size*1.5)
    return y


def card(segment,owner,summary):
    image=Image.new('RGB',(1920,1080),BG);d=ImageDraw.Draw(image)
    d.text((80,55),'SHELFSIGNAL  /  OPENCV AI COMPETITION 2026',font=font(25,True),fill=BLUE)
    d.line((80,115,1840,115),fill='#D6E1E8',width=2)
    title=segment['title'];d.text((80,165),title,font=font(72,True),fill=INK)
    if segment['id']=='01-intro':
        d.text((84,275),'Evidence before action.',font=font(52),fill=BLUE)
        wrapped(d,'A reference-based inspection loop for small retail shelves.',(84,380),1550,43)
        for i,label in enumerate(['COMPARE THE SHELF','REVIEW THE PROPOSAL','VERIFY THE FOLLOW-UP']):
            x=84+i*580;d.text((x,535),f'0{i+1}',font=font(58),fill=BLUE)
            wrapped(d,label,(x,625),520,32,INK,True)
        d.text((84,795),'Team: '+owner,font=font(34,True),fill=INK)
        d.text((84,850),'Implementation assistance: OpenAI Codex',font=font(30),fill=GRAY)
    elif segment['id']=='09-architecture':
        boxes=[(80,345,560,510,'React workspace','Loopback FastAPI proxy'),(710,345,1210,510,'AWS Lambda','OpenCV 5 + policy engine'),(1360,270,1835,425,'Private S3','Originals, overlays, traces'),(1360,490,1835,645,'DynamoDB','Revision + snapshot pointer')]
        for x1,y1,x2,y2,label,sub in boxes:
            d.rounded_rectangle((x1,y1,x2,y2),radius=12,fill='white',outline='#C8D9E2',width=3)
            d.text((x1+25,y1+30),label,font=font(36,True),fill=INK)
            wrapped(d,sub,(x1+25,y1+90),x2-x1-45,26,GRAY)
        d.line((560,425,710,425),fill=BLUE,width=6);d.polygon([(710,425),(690,412),(690,438)],fill=BLUE)
        d.line((1210,425,1280,425,1280,350,1360,350),fill=BLUE,width=6)
        d.line((1280,425,1280,565,1360,565),fill=BLUE,width=6)
        d.text((585,320),'IAM',font=font(28,True),fill=BLUE)
        wrapped(d,'CodeBuild → Linux tests → ECR image digest → CloudFormation',(80,745),1720,38,INK,True)
        wrapped(d,'Python 3.12.15  •  OpenCV 5.0.0  •  x86_64  •  Authenticated processing',(80,830),1720,33,GRAY)
    elif segment['id']=='10-results':
        metrics=[('88','synthetic inspections'),(f"{summary['precision']*100:.1f}%",'position precision'),(f"{summary['recall']*100:.0f}%",'position recall'),('80 / 88','expected action agreement'),('24 / 24','follow-up classifications'),('8','false positives')]
        for i,(value,label) in enumerate(metrics):
            x=80+(i%3)*600;y=335+(i//3)*260
            d.text((x,y),value,font=font(86,True),fill=AMBER if i==5 else BLUE)
            wrapped(d,label,(x,y+112),535,33,GRAY)
        d.text((80,900),'Synthetic fixtures do not establish real-store performance.',font=font(34,True),fill=INK)
    elif segment['id']=='11-failure':
        example=Image.open(ROOT/'docs/evidence/flat_occlusion.png').convert('RGB');example.thumbnail((1070,660))
        image.paste(example,(80,320))
        y=wrapped(d,'Flat occlusion can look like an empty position.',(1220,330),600,43,AMBER,True)
        y=wrapped(d,'Lost edges and texture do not prove an empty shelf.',(1220,y+42),600,35,GRAY)
        wrapped(d,'8 false positives in the synthetic benchmark. Human review remains essential.',(1220,y+42),600,35,INK,True)
    elif segment['id']=='12-close':
        wrapped(d,'A complete visual loop with human control.',(80,315),1700,49,BLUE)
        for i,label in enumerate(['Actual AWS execution and private persistence','Pinned dependencies, reproducible tests and measured evaluation','Known failures reported alongside successful cases']):
            d.text((84,460+i*100),'✓',font=font(42),fill=GREEN)
            wrapped(d,label,(155,460+i*100),1650,36,INK)
        d.text((80,820),'github.com/ShogunAce/ShelfSignal',font=font(39,True),fill=BLUE)
        d.text((80,890),'Team: '+owner+'  /  Coding assistance: OpenAI Codex',font=font(30),fill=GRAY)
    d.line((80,1000,1840,1000),fill='#D6E1E8',width=2)
    d.text((80,1020),'Synthetic photographs  •  Actual AWS workflow  •  Synthesized narration',font=font(24),fill=GRAY)
    path=WORK/(segment['id']+'.png');image.save(path)
    return path


def main():
    p=argparse.ArgumentParser();p.add_argument('--team',default='Kenosis Interactive');args=p.parse_args()
    ffmpeg=shutil.which('ffmpeg');ffprobe=shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:raise RuntimeError('Install FFmpeg or make it available on PATH')
    OUT.mkdir(parents=True,exist_ok=True)
    segments=json.loads((WORK/'durations.json').read_text())
    timeline=json.loads((WORK/'capture-timeline.json').read_text())
    assert not timeline['errors']
    captures={r['id']:r for r in timeline['recordings']}
    summary=json.loads((ROOT/'evaluation/results.json').read_text())['summary']
    rendered=[];chapters=[];total=0
    for s in segments:
        duration=s['duration']+2
        output=WORK/(s['id']+'.mp4')
        cmd=[ffmpeg,'-hide_banner','-loglevel','error','-y']
        if s['kind']=='card':
            visual=card(s,args.team,summary)
            cmd+=['-loop','1','-i',str(visual)]
        else:
            capture=captures[s['id']];duration=max(duration,capture['duration'])
            cmd+=['-ss',str(capture['start']),'-i',str(WORK/'raw/aws-workflow.webm')]
        cmd+=['-i',str(WORK/'audio'/(s['id']+'.wav')),'-t',str(duration),'-vf','scale=1920:1080,fps=30','-af','apad','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(output)]
        subprocess.run(cmd,check=True)
        rendered.append(output)
        chapters.append({'id':s['id'],'start':round(total,3),'duration':round(duration,3),'narration':s['narration'],'type':s['kind']})
        total+=duration
        print('Rendered',s['id'],round(duration,1),'seconds',flush=True)
    concat=WORK/'concat.txt';concat.write_text('\n'.join("file '"+p.as_posix()+"'" for p in rendered),encoding='utf-8')
    final=OUT/'ShelfSignal-demo.mp4'
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(final)],check=True)
    probe=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_format','-show_streams','-of','json',str(final)]))
    duration=float(probe['format']['duration']);assert duration<300,duration
    assert any(s['codec_type']=='audio' for s in probe['streams'])
    meta={'recorded_at':timeline['started_at'],'rendered_at':datetime.now(timezone.utc).isoformat(),'duration_seconds':duration,'width':1920,'height':1080,'bytes':final.stat().st_size,'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'team_credit':args.team,'narration':'Microsoft Zira Desktop, synthesized locally','footage':'Actual AWS application recording using synthetic shelf photographs; explanatory title cards are edited in.','inspection_id':json.loads((WORK/'recorded-inspection.json').read_text())['id'],'chapters':chapters}
    (OUT/'video-evidence.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
    (OUT/'transcript.md').write_text('# ShelfSignal demo transcript\n\n'+ '\n\n'.join(f"## {x['id']} — {x['start']:.1f}s\n\n{x['narration']}" for x in chapters),encoding='utf-8')
    print(json.dumps({k:v for k,v in meta.items() if k!='chapters'},indent=2),flush=True)


if __name__=='__main__':main()
