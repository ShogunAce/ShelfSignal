import json, os, sqlite3, uuid
from pathlib import Path
from typing import Protocol

class Conflict(Exception): pass
class Repository(Protocol):
    def get(self, key: str) -> dict: ...
    def save(self, item: dict) -> None: ...
    def put_image(self, key: str, body: bytes) -> None: ...
    def image(self, key: str) -> bytes: ...

class LocalRepository:
    def __init__(self, root=None):
        self.root=Path(root or os.getenv('DATA_DIR','data')); self.root.mkdir(parents=True,exist_ok=True)
        self.db=self.root/'shelfsignal.sqlite'
        with sqlite3.connect(self.db) as c:
            c.execute('CREATE TABLE IF NOT EXISTS inspections (id TEXT PRIMARY KEY, revision INTEGER, body TEXT)')
    def get(self,key):
        with sqlite3.connect(self.db) as c: row=c.execute('SELECT body FROM inspections WHERE id=?',(key,)).fetchone()
        if not row: raise KeyError(key)
        return json.loads(row[0])
    def save(self,item):
        old=item.get('revision',0); new={**item,'revision':old+1}
        with sqlite3.connect(self.db) as c:
            if old==0:
                try: c.execute('INSERT INTO inspections VALUES (?,?,?)',(item['id'],1,json.dumps(new)))
                except sqlite3.IntegrityError: raise Conflict('Inspection already exists')
            elif c.execute('UPDATE inspections SET revision=?,body=? WHERE id=? AND revision=?',(old+1,json.dumps(new),item['id'],old)).rowcount!=1:
                raise Conflict('Inspection changed concurrently; reload and retry')
        item['revision']=old+1
    def put_image(self,key,body):
        target=self.root/'images'/key;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body)
    def image(self,key): return (self.root/'images'/key).read_bytes()

class CloudRepository:
    def __init__(self):
        import boto3
        self.s3=boto3.client('s3');self.ddb=boto3.client('dynamodb')
        self.bucket=os.environ['IMAGE_BUCKET'];self.table=os.environ['INSPECTION_TABLE']
    def get(self,key):
        item=self.ddb.get_item(TableName=self.table,Key={'id':{'S':key}},ConsistentRead=True).get('Item')
        if not item: raise KeyError(key)
        if 'body_key' in item:return json.loads(self.image(item['body_key']['S']))
        return json.loads(item['body']['S'])
    def save(self,item):
        old=item.get('revision',0);new={**item,'revision':old+1}
        # Immutable S3 snapshots keep full traces outside DynamoDB's 400 KB item limit.
        # Publish the pointer only after S3 succeeds; losing CAS writes expire via lifecycle.
        body_key=f'{item["id"]}/records/{old+1}-{uuid.uuid4()}.json'
        self.put_image(body_key,json.dumps(new).encode('utf-8'))
        args={'TableName':self.table,'Item':{'id':{'S':item['id']},'revision':{'N':str(old+1)},'body_key':{'S':body_key},'expires':{'N':str(item['expires'])}},'ConditionExpression':'attribute_not_exists(id)' if old==0 else 'revision = :old'}
        if old: args['ExpressionAttributeValues']={':old':{'N':str(old)}}
        try: self.ddb.put_item(**args)
        except self.ddb.exceptions.ConditionalCheckFailedException: raise Conflict('Concurrent update; reload and retry')
        item['revision']=old+1
    def put_image(self,key,body): self.s3.put_object(Bucket=self.bucket,Key=key,Body=body,ContentType='application/octet-stream',ServerSideEncryption='AES256')
    def image(self,key): return self.s3.get_object(Bucket=self.bucket,Key=key)['Body'].read()
