"""Guest gateway checks are independent of the private processor container."""
import hashlib
import json
import time
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError
from guest_demo import handler as demo


@pytest.fixture
def gateway(monkeypatch):
    monkeypatch.setenv('SITE_ORIGIN', 'https://shelf-signals.netlify.app')
    token = 'A' * 43
    owner = 'session:' + hashlib.sha256(token.encode()).hexdigest()
    records = {owner: {'id': owner, 'expires': int(time.time()) + 300},
               'inspection:' + '1' * 36: {'owner': owner, 'expires': int(time.time()) + 300, 'folder': 'elevenlabs'}}
    db = Mock()
    db.get_item.side_effect = lambda **kw: {'Item': records.get(kw['Key']['id'])}
    monkeypatch.setattr(demo, '_table', db)
    invoke = Mock(return_value=demo.response(200, {'state': 'TASK_APPROVED'}))
    monkeypatch.setattr(demo, 'invoke', invoke)
    def request(path, method='GET', data=None, authenticated=True, origin='https://shelf-signals.netlify.app'):
        return demo.handler({'rawPath': path, 'requestContext': {'http': {'method': method}},
                             'headers': {'origin': origin},
                             'cookies': [demo.COOKIE + '=' + token] if authenticated else [],
                             'body': json.dumps(data) if data is not None else ''}, SimpleNamespace())
    return request, invoke, records, owner, db


def test_guest_session_is_secure_and_processor_requires_session(gateway):
    request, invoke, _, _, db = gateway
    assert request('/version', authenticated=False)['statusCode'] == 401
    result = request('/session', 'POST', {}, authenticated=False)
    assert result['statusCode'] == 200
    assert 'HttpOnly; Secure; SameSite=Strict; Path=/api' in result['cookies'][0]
    saved = db.put_item.call_args.kwargs['Item']
    assert saved['id'].startswith('session:')
    assert result['cookies'][0].split('=')[1].split(';')[0] not in saved['id']
    invoke.assert_not_called()


def test_guest_cannot_read_or_mutate_another_visitors_inspection(gateway):
    request, invoke, records, _, _ = gateway
    records['inspection:' + '1' * 36]['owner'] = 'another visitor'
    for method, suffix in [('GET', ''), ('GET', '/media/reference'), ('POST', '/analyze'), ('POST', '/approval')]:
        assert request('/inspections/' + '1' * 36 + suffix, method, {'approved': True} if suffix == '/approval' else {})['statusCode'] == 404
    invoke.assert_not_called()


def test_expired_session_and_cross_site_mutations_are_rejected(gateway):
    request, invoke, records, owner, _ = gateway
    assert request('/session', 'POST', {}, origin='https://unrelated.example')['statusCode'] == 403
    records[owner]['expires'] = int(time.time()) - 1
    assert request('/version')['statusCode'] == 401
    invoke.assert_not_called()


def test_guest_route_allowlist_blocks_uploads_regions_and_arbitrary_cases(gateway):
    request, invoke, _, _, _ = gateway
    for suffix in ('reference', 'image', 'regions', 'upload-ticket', 'upload-complete', 'media-ticket/reference'):
        assert request('/inspections/' + '1' * 36 + '/' + suffix, 'POST', {})['statusCode'] == 404
    for case in ('../../private', 'unknown'):
        assert request('/demo/load', 'POST', {'case': case})['statusCode'] == 422
    assert request('/inspections', 'POST', {})['statusCode'] == 404
    invoke.assert_not_called()


def test_explicit_boolean_approval_required_and_rejection_preserved(gateway):
    request, invoke, _, _, _ = gateway
    path = '/inspections/' + '1' * 36 + '/approval'
    for body in ({}, {'approved': 'true'}, {'approved': 1}, {'approved': True, 'extra': 1}):
        assert request(path, 'POST', body)['statusCode'] == 422
    invoke.assert_not_called()
    assert request(path, 'POST', {'approved': False})['statusCode'] == 200
    assert json.loads(invoke.call_args.args[2]) == {'approved': False}


def test_quota_failure_prevents_processing(gateway):
    request, invoke, _, _, db = gateway
    db.update_item.side_effect = ClientError({'Error': {'Code': 'ConditionalCheckFailedException'}}, 'UpdateItem')
    assert request('/inspections/' + '1' * 36 + '/analyze', 'POST', {})['statusCode'] == 429
    invoke.assert_not_called()


def test_refill_uses_owned_shelf_not_a_client_supplied_filename(gateway, monkeypatch):
    request, invoke, _, _, _ = gateway
    upload = Mock(return_value={'state': 'TASK_APPROVED'})
    monkeypatch.setattr(demo, 'upload', upload)
    path = '/inspections/' + '1' * 36 + '/followup'
    assert request(path, 'POST', {'filename': 'arbitrary.jpg'})['statusCode'] == 422
    assert request(path, 'POST', {})['statusCode'] == 200
    upload.assert_called_once_with('1' * 36, 'followup', 'elevenlabs', 'refilled.jpg')
