"""Bounded anonymous synthetic demo. The inspection processor remains IAM protected."""
import base64
import hashlib
import json
import os
import re
import secrets
import time
import uuid
from http.cookies import SimpleCookie
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

ASSETS = Path(__file__).parent / 'assets'
AI_CASES = {'ai_single_gap': 'missing-item.png', 'ai_no_change': 'no-change.jpg', 'ai_blur': 'blurred.jpg'}
CASES = {**{key: ('elevenlabs', value) for key, value in AI_CASES.items()},
         **{key: ('procedural', key + '.jpg') for key in
            ('single_gap', 'multiple_gaps', 'no_change', 'blur', 'alignment_failure', 'occlusion', 'lighting')}}
COOKIE = 'shelfsignal_demo'
TTL = 4 * 3600
_table = None
_lambda = None


class Rejected(Exception):
    def __init__(self, status, detail):
        self.status, self.detail = status, detail


def table():
    global _table
    if _table is None:
        _table = boto3.resource('dynamodb').Table(os.environ['SESSION_TABLE'])
    return _table


def response(status, body, cookies=None):
    result = {'statusCode': status, 'headers': {'content-type': 'application/json',
              'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff'},
              'body': json.dumps(body)}
    if cookies:
        result['cookies'] = cookies
    return result


def budget(key, limit, period=86400):
    now = int(time.time())
    try:
        table().update_item(Key={'id': f'quota:{key}:{now // period}'},
            UpdateExpression='SET expires = :expiry ADD used :one',
            ConditionExpression='attribute_not_exists(used) OR used < :limit',
            ExpressionAttributeValues={':expiry': now + period * 2, ':one': 1, ':limit': limit})
    except ClientError as exc:
        if exc.response['Error']['Code'] != 'ConditionalCheckFailedException':
            raise
        raise Rejected(429, 'The synthetic demo usage limit was reached. Please try again later.') from None


def session(event):
    cookies = SimpleCookie()
    cookies.load('; '.join(event.get('cookies', []) + [event.get('headers', {}).get('cookie', '')]))
    token = cookies[COOKIE].value if COOKIE in cookies else ''
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
        return None
    key = 'session:' + hashlib.sha256(token.encode()).hexdigest()
    item = table().get_item(Key={'id': key}, ConsistentRead=True).get('Item')
    return item if item and item['expires'] > time.time() else None


def invoke(method, path, body=b'', content_type='application/json'):
    global _lambda
    # Count all processor calls, including reads, before authorizing AWS work.
    budget('processor', 5000)
    if _lambda is None:
        _lambda = boto3.client('lambda', config=Config(connect_timeout=3, read_timeout=35,
                                                     retries={'max_attempts': 0}))
    event = {'version': '2.0', 'routeKey': '$default', 'rawPath': path, 'rawQueryString': '',
             'headers': {'host': 'localhost', 'content-type': content_type},
             'requestContext': {'http': {'method': method, 'path': path, 'protocol': 'HTTP/1.1',
                                       'sourceIp': '127.0.0.1', 'userAgent': 'ShelfSignal-guest-demo'},
                                'requestId': str(uuid.uuid4()), 'stage': '$default'},
             'isBase64Encoded': True, 'body': base64.b64encode(body).decode()}
    result = _lambda.invoke(FunctionName=os.environ['PROCESSOR'], Payload=json.dumps(event).encode())
    payload = json.loads(result['Payload'].read())
    if result.get('FunctionError'):
        raise Rejected(503, 'AWS inspection is temporarily unavailable. Please try again.')
    payload.setdefault('headers', {}).update({'cache-control': 'private, no-store',
                                            'x-content-type-options': 'nosniff'})
    return payload


def rpc(method, path, data=None):
    result = invoke(method, path, json.dumps(data).encode() if data is not None else b'')
    body = json.loads(result['body'])
    if result['statusCode'] >= 400:
        raise Rejected(result['statusCode'], body.get('detail', 'Inspection request failed.'))
    return body


def upload(id, kind, folder, filename):
    # Only server-selected bundled files can reach the private processor.
    boundary = 'ShelfSignal' + secrets.token_hex(16)
    raw = (ASSETS / folder / filename).read_bytes()
    mime = 'image/png' if filename.endswith('.png') else 'image/jpeg'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f'Content-Type: {mime}\r\n\r\n').encode() + raw + f'\r\n--{boundary}--\r\n'.encode()
    result = invoke('POST', f'/inspections/{id}/{kind}', body, f'multipart/form-data; boundary={boundary}')
    data = json.loads(result['body'])
    if result['statusCode'] >= 400:
        raise Rejected(result['statusCode'], data.get('detail', 'Example upload failed.'))
    return data


def dispatch(event):
    method = event['requestContext']['http']['method']
    path = event.get('rawPath', '')
    headers = {key.lower(): value for key, value in event.get('headers', {}).items()}
    if method == 'POST' and headers.get('origin') != os.environ['SITE_ORIGIN']:
        raise Rejected(403, 'Open the synthetic demo on the ShelfSignal website.')
    raw = event.get('body') or ''
    if len(raw) > 2048:
        raise Rejected(413, 'This demo accepts bundled examples only.')
    if event.get('isBase64Encoded'):
        raw = base64.b64decode(raw).decode()
    try:
        data = json.loads(raw or '{}')
    except (ValueError, UnicodeError):
        raise Rejected(400, 'Invalid request.') from None
    if not isinstance(data, dict):
        raise Rejected(400, 'Invalid request.')
    visitor = session(event)
    if method == 'POST' and path == '/session':
        if visitor:
            return response(200, {'mode': 'synthetic', 'expires': int(visitor['expires'])})
        budget('sessions', 500)
        token = secrets.token_urlsafe(32)
        expiry = int(time.time()) + TTL
        table().put_item(Item={'id': 'session:' + hashlib.sha256(token.encode()).hexdigest(), 'expires': expiry})
        return response(200, {'mode': 'synthetic', 'expires': expiry},
                        [f'{COOKIE}={token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age={TTL}'])
    if not visitor:
        raise Rejected(401, 'Your demo session expired. Refresh the page to start a new example.')
    budget(visitor['id'], 500, TTL)
    if method == 'GET' and path == '/version':
        return invoke('GET', '/version')
    if method == 'POST' and path == '/demo/load':
        if set(data) != {'case'} or data['case'] not in CASES:
            raise Rejected(422, 'Choose one of the bundled synthetic examples.')
        budget('loads:' + visitor['id'], 25, TTL)
        folder, filename = CASES[data['case']]
        item = rpc('POST', '/inspections', {})
        id = item['id']
        table().put_item(Item={'id': 'inspection:' + id, 'owner': visitor['id'],
                              'folder': folder, 'expires': visitor['expires']})
        upload(id, 'reference', folder, 'reference.png')
        upload(id, 'image', folder, filename)
        # Only reference geometry is supplied. Fixture labels are never packaged.
        regions = json.loads((ASSETS / folder / 'regions.json').read_text())
        return response(200, rpc('POST', f'/inspections/{id}/regions', regions))
    match = re.fullmatch(r'/inspections/([0-9a-f-]{36})(?:/(analyze|approval|verify|followup|media/(?:reference|image|followup|overlay|verification)))?', path)
    if not match:
        raise Rejected(404, 'This route is not available in the synthetic demo.')
    id, action = match.groups()
    owned = table().get_item(Key={'id': 'inspection:' + id}, ConsistentRead=True).get('Item')
    if not owned or owned['owner'] != visitor['id'] or owned['expires'] <= time.time():
        raise Rejected(404, 'This inspection is not part of your demo session. Load a new example.')
    if method == 'GET' and (action is None or action.startswith('media/')):
        return invoke('GET', path)
    if method == 'POST' and action in ('analyze', 'approval', 'verify', 'followup'):
        if action == 'approval':
            if set(data) != {'approved'} or type(data['approved']) is not bool:
                raise Rejected(422, 'An explicit approve or reject decision is required.')
        elif data:
            raise Rejected(422, 'This demo accepts bundled examples only.')
        budget('actions:' + visitor['id'], 100, TTL)
        if action == 'followup':
            return response(200, upload(id, 'followup', owned['folder'], 'refilled.jpg'))
        return response(200, rpc('POST', path, data))
    raise Rejected(405, 'Method not available.')


def handler(event, context):
    try:
        return dispatch(event)
    except Rejected as exc:
        return response(exc.status, {'detail': exc.detail})
    except Exception as exc:
        # Do not log events, cookies, payloads or service exception messages.
        print(json.dumps({'error_type': type(exc).__name__, 'request_id': getattr(context, 'aws_request_id', '')}))
        return response(503, {'detail': 'The synthetic demo is temporarily unavailable. Please try again.'})
