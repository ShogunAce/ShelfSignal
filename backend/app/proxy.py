"""Loopback-only server-side proxy. AWS credentials never enter the browser."""
import base64, json, os
import boto3
from botocore.config import Config
from fastapi import Request
from fastapi.responses import Response, JSONResponse
from starlette.concurrency import run_in_threadpool


def invoke(method,path,body=b'',content_type='application/json',idempotency_key=None):
    event={'version':'2.0','routeKey':'$default','rawPath':path,'rawQueryString':'','headers':{'host':'localhost','content-type':content_type},'requestContext':{'accountId':'local-proxy','apiId':'proxy','domainName':'localhost','domainPrefix':'proxy','http':{'method':method,'path':path,'protocol':'HTTP/1.1','sourceIp':'127.0.0.1','userAgent':'ShelfSignal-local-proxy'},'requestId':'local','routeKey':'$default','stage':'$default','timeEpoch':0},'isBase64Encoded':True,'body':base64.b64encode(body).decode()}
    if idempotency_key:event['headers']['idempotency-key']=idempotency_key
    client=boto3.client('lambda',region_name=os.getenv('AWS_DEFAULT_REGION','us-west-2'),config=Config(connect_timeout=5,read_timeout=45,retries={'max_attempts':0}))
    response=client.invoke(FunctionName=os.environ['CLOUD_FUNCTION'],Payload=json.dumps(event).encode())
    payload=json.loads(response['Payload'].read())
    if response.get('FunctionError'):raise RuntimeError('AWS processing failed; inspect CloudWatch logs')
    return payload

async def forward(request:Request):
    try:
        path=request.url.path
        if request.method=='GET' and '/media/' in path:
            # Download originals directly from private S3 on the server, not through
            # Lambda's base64 response envelope (which cannot fit an 8 MB original).
            import httpx
            payload=await run_in_threadpool(invoke,'GET',path.replace('/media/','/media-ticket/'))
            if payload['statusCode']!=200:return response(payload)
            async with httpx.AsyncClient(timeout=30) as client:
                result=await client.get(json.loads(payload['body'])['url'])
                result.raise_for_status()
            raw=result.content
            mime='image/png' if raw.startswith(b'\x89PNG') else ('image/jpeg' if raw.startswith(b'\xff\xd8') else 'image/webp')
            return Response(raw,media_type=mime,headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
        if request.method=='POST' and path.split('/')[-1] in {'reference','image','followup'}:
            # Keep image bytes out of Lambda invoke's 6 MB transport limit.
            import httpx
            form=await request.form();file=form['file'];raw=await file.read(8*1024*1024+1)
            from .vision import decode
            decode(raw)
            prefix,kind=path.rsplit('/',1)
            ticket=await run_in_threadpool(invoke,'POST',prefix+'/upload-ticket',json.dumps({'kind':kind}).encode())
            if ticket['statusCode']!=200:return response(ticket)
            data=json.loads(ticket['body'])
            async with httpx.AsyncClient(timeout=30) as client:
                result=await client.post(data['upload']['url'],data=data['upload']['fields'],files={'file':('image',raw)})
                result.raise_for_status()
            payload=await run_in_threadpool(invoke,'POST',prefix+'/upload-complete',json.dumps({'kind':kind,'key':data['key']}).encode())
        else:
            payload=await run_in_threadpool(invoke,request.method,path,await request.body(),request.headers.get('content-type','application/json'),request.headers.get('idempotency-key'))
        return response(payload)
    except Exception as exc:
        return JSONResponse({'detail':f'AWS proxy unavailable ({type(exc).__name__}). Check aws login, region and Lambda permissions; no local processing was substituted.'},503)

def response(payload):
    body=payload.get('body','')
    body=base64.b64decode(body) if payload.get('isBase64Encoded') else body.encode()
    headers={k:v for k,v in payload.get('headers',{}).items() if k.lower() not in {'content-length','transfer-encoding'}}
    return Response(body,status_code=payload['statusCode'],headers=headers)
