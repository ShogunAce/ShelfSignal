import os, time, uuid, hashlib
from collections import defaultdict, deque
from pathlib import Path
from fastapi import FastAPI, UploadFile, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator
from mangum import Mangum
import cv2, numpy as np
from .storage import LocalRepository, CloudRepository, Conflict
from . import workflow
from .vision import decode, MAX_BYTES, ALGORITHM

app=FastAPI(title='ShelfSignal',version='1.0.0')
repo=CloudRepository() if os.getenv('IMAGE_BUCKET') else LocalRepository()
rate=defaultdict(deque)

class Region(BaseModel):
    id: str=Field(pattern=r'^[A-Za-z0-9_-]{1,24}$')
    box: tuple[float,float,float,float]
    @model_validator(mode='after')
    def bounds(self):
        x,y,w,h=self.box
        if not all(np.isfinite(v) for v in self.box) or x<0 or y<0 or w<.015 or h<.015 or x+w>1.00001 or y+h>1.00001: raise ValueError('Expected position must fit inside image with positive area')
        return self
class Regions(BaseModel):
    regions: list[Region]=Field(min_length=1,max_length=60)
    @model_validator(mode='after')
    def unique(self):
        if len({r.id for r in self.regions})!=len(self.regions): raise ValueError('Position IDs must be unique')
        return self
class Approval(BaseModel): approved: bool

@app.middleware('http')
async def guard(request:Request,call_next):
    # Cloud is protected by Lambda IAM. Local service binds loopback and rejects foreign origins.
    origin=request.headers.get('origin')
    if origin and origin not in {'http://127.0.0.1:8000','http://localhost:8000','http://127.0.0.1:5173','http://localhost:5173'}:
        return JSONResponse({'detail':'Origin not allowed'},403)
    host=request.headers.get('host','').split(':')[0]
    if not os.getenv('AWS_LAMBDA_FUNCTION_NAME') and host not in {'localhost','127.0.0.1','testserver'}:
        return JSONResponse({'detail':'Host not allowed'},403)
    try: content_length=int(request.headers.get('content-length','0'))
    except ValueError: return JSONResponse({'detail':'Invalid Content-Length'},400)
    if content_length>MAX_BYTES+65536:
        return JSONResponse({'detail':'Upload too large'},413)
    if request.method=='POST':
        now=time.monotonic();q=rate['local']
        while q and now-q[0]>60:q.popleft()
        if len(q)>=120:return JSONResponse({'detail':'Request limit reached; retry in a minute'},429)
        q.append(now)
    if os.getenv('CLOUD_FUNCTION') and request.url.path.startswith(('/inspections','/health','/version','/demo')):
        from .proxy import forward
        return await forward(request)
    try: return await call_next(request)
    except Conflict as exc: return JSONResponse({'detail':str(exc)},409)
    except ValueError as exc: return JSONResponse({'detail':str(exc)},422)
    except KeyError: return JSONResponse({'detail':'Inspection not found'},404)

def get_item(id):
    try: uuid.UUID(id)
    except ValueError: raise HTTPException(404,'Inspection not found')
    return repo.get(id)

@app.get('/health')
def health(): return {'status':'ok','release_ready':cv2.__version__.split('.')[0]=='5','runtime':'AWS Lambda' if os.getenv('AWS_LAMBDA_FUNCTION_NAME') else 'Local Python'}
@app.get('/version')
def version():
    import platform
    return {**health(),'opencv':cv2.__version__,'numpy':np.__version__,'python':platform.python_version(),'architecture':platform.machine(),'algorithm':ALGORITHM}
@app.post('/inspections')
def create(request:Request):
    key=request.headers.get('idempotency-key')
    if key:
        try: key=str(uuid.UUID(key))
        except ValueError: raise HTTPException(422,'Idempotency-Key must be UUID')
        try:return repo.get(key)
        except KeyError:pass
    return workflow.create(repo,key)
@app.get('/inspections/{id}')
def read(id:str):return get_item(id)
@app.get('/inspections/{id}/candidates')
def candidates(id:str):return get_item(id)['candidates']
@app.get('/inspections/{id}/events')
def events(id:str):return get_item(id)['events']
@app.post('/inspections/{id}/regions')
def regions(id:str,payload:Regions):
    item=get_item(id)
    if item['state']!='CREATED':raise HTTPException(409,'Positions are locked after analysis; start a new inspection to change them')
    item['regions']=[r.model_dump() for r in payload.regions]
    workflow.event(repo,item,'define_positions','operator_annotations','Expected product positions saved',{'regions':item['regions']})
    return item

UPLOAD_STATES={'reference':{'CREATED'},'image':{'CREATED','RESCAN_REQUIRED','FAILED'},'followup':{'TASK_APPROVED','UNRESOLVED','INCONCLUSIVE'}}

def check_upload(item,kind):
    if item['state'] not in UPLOAD_STATES[kind]:raise HTTPException(409,'This image is locked in the current state')

async def upload(id,kind,file):
    item=get_item(id)
    check_upload(item,kind)
    raw=await file.read(MAX_BYTES+1)
    decode(raw)
    key=f'{id}/{uuid.uuid4()}/{kind}';repo.put_image(key,raw);item['images'][kind]=key
    metadata={'kind':kind,'key':key,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
    item.setdefault('image_history',[]).append(metadata)
    # An overlay only describes the exact capture used to produce it.
    if kind=='image':item['images'].pop('overlay',None)
    if kind=='followup':
        item['images'].pop('verification',None)
        item['verification']=None
    workflow.event(repo,item,'upload_'+kind,'original_preserved','Original photograph preserved',metadata)
    return item
@app.post('/inspections/{id}/reference')
async def reference(id:str,file:UploadFile):return await upload(id,'reference',file)
@app.post('/inspections/{id}/image')
async def inspection_image(id:str,file:UploadFile):return await upload(id,'image',file)
@app.post('/inspections/{id}/followup')
async def followup(id:str,file:UploadFile):return await upload(id,'followup',file)
@app.get('/inspections/{id}/media/{kind}')
def media(id:str,kind:str):
    item=get_item(id)
    if kind not in item['images']:raise HTTPException(404,'Image not available')
    raw=repo.image(item['images'][kind])
    mime='image/png' if raw.startswith(b'\x89PNG') else ('image/jpeg' if raw.startswith(b'\xff\xd8') else 'image/webp')
    return Response(raw,media_type=mime,headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
@app.post('/inspections/{id}/analyze')
def analyze(id:str):return workflow.run_analysis(repo,get_item(id))
@app.post('/inspections/{id}/decision')
def decision(id:str):return workflow.decide(repo,get_item(id))
@app.post('/inspections/{id}/approval')
def approval(id:str,payload:Approval):return workflow.approve(repo,get_item(id),payload.approved)
@app.post('/inspections/{id}/verify')
def verify(id:str):return workflow.verify(repo,get_item(id))
@app.get('/inspections/{id}/verification')
def verification(id:str):return get_item(id)['verification']

# Private S3 transport: IAM-protected API issues a bounded presigned POST and validates on completion.
class UploadTicket(BaseModel):
    kind: str=Field(pattern='^(reference|image|followup)$')
@app.post('/inspections/{id}/upload-ticket')
def ticket(id:str,payload:UploadTicket):
    check_upload(get_item(id),payload.kind)
    if not isinstance(repo,CloudRepository):raise HTTPException(400,'Cloud upload only')
    key=f'{id}/incoming/{uuid.uuid4()}/{payload.kind}'
    return {'key':key,'upload':repo.s3.generate_presigned_post(repo.bucket,key,Conditions=[['content-length-range',1,MAX_BYTES]],ExpiresIn=300)}
class UploadComplete(BaseModel):
    key:str
    kind:str=Field(pattern='^(reference|image|followup)$')
@app.post('/inspections/{id}/upload-complete')
async def complete(id:str,payload:UploadComplete):
    check_upload(get_item(id),payload.kind)
    if not isinstance(repo,CloudRepository) or not payload.key.startswith(f'{id}/incoming/') or not payload.key.endswith('/'+payload.kind):raise HTTPException(422,'Invalid upload reference')
    info=repo.s3.head_object(Bucket=repo.bucket,Key=payload.key)
    if info['ContentLength']>MAX_BYTES:raise HTTPException(413,'Upload too large')
    import io
    return await upload(id,payload.kind,UploadFile(io.BytesIO(repo.image(payload.key))))

@app.get('/inspections/{id}/media-ticket/{kind}')
def media_ticket(id:str,kind:str):
    item=get_item(id)
    if not isinstance(repo,CloudRepository):raise HTTPException(400,'Cloud download only')
    if kind not in item['images']:raise HTTPException(404,'Image not available')
    return {'url':repo.s3.generate_presigned_url('get_object',Params={'Bucket':repo.bucket,'Key':item['images'][kind]},ExpiresIn=60)}

@app.get('/demo/manifest')
def demo_manifest():
    import json
    root=Path('fixtures/generated')
    if not (root/'manifest.json').exists():raise HTTPException(404,'Generate synthetic fixtures first')
    return {'synthetic':True,'regions':json.loads((root/'manifest.json').read_text())['cases'][0]['regions']}
@app.get('/demo/image/{name}')
def demo_image(name:str):
    allowed={'reference.png','single_gap.jpg','multiple_gaps.jpg','no_change.jpg','blur.jpg','alignment_failure.jpg','occlusion.jpg','lighting.jpg','refilled.jpg','still_empty.jpg'}
    if name not in allowed:raise HTTPException(404,'Example not found')
    path=Path('fixtures/generated/0')/name
    if not path.exists():raise HTTPException(404,'Generate synthetic fixtures first')
    return Response(path.read_bytes(),media_type='image/png' if name.endswith('.png') else 'image/jpeg')

handler=Mangum(app,lifespan='off')
frontend=Path(__file__).resolve().parents[2]/'frontend'/'dist'
if frontend.exists():app.mount('/',StaticFiles(directory=frontend,html=True),name='ui')
