from unittest.mock import Mock, patch

from flask_jwt_extended import create_access_token


def auth_headers(app):
    with app.app_context():
        token = create_access_token(identity='location-test-user')
    return {'Authorization': f'Bearer {token}'}


def test_geocode_requires_authentication(client):
    response = client.post('/api/location/geocode', json={'address': '1 Main Road, Cape Town'})

    assert response.status_code == 401


def test_geocode_resolves_manual_address(client, app):
    upstream = Mock()
    upstream.raise_for_status.return_value = None
    upstream.json.return_value = {
        'status': 'OK',
        'results': [{
            'formatted_address': '1 Main Road, Cape Town, South Africa',
            'geometry': {'location': {'lat': -33.9249, 'lng': 18.4241}},
        }],
    }

    with app.app_context():
        app.config['GOOGLE_MAPS_API_KEY'] = 'test-maps-key'

    with patch('backend.routes.location.http_requests.get', return_value=upstream) as request_get:
        response = client.post(
            '/api/location/geocode',
            json={'address': '1 Main Road, Cape Town'},
            headers=auth_headers(app),
        )

    assert response.status_code == 200
    assert response.get_json()['data'] == {
        'address': '1 Main Road, Cape Town, South Africa',
        'coords': {'lat': -33.9249, 'lng': 18.4241},
    }
    assert request_get.call_args.kwargs['params']['components'] == 'country:ZA'
    assert request_get.call_args.kwargs['timeout'] == 8


def test_geocode_reports_unknown_address(client, app):
    upstream = Mock()
    upstream.raise_for_status.return_value = None
    upstream.json.return_value = {'status': 'ZERO_RESULTS', 'results': []}

    with app.app_context():
        app.config['GOOGLE_MAPS_API_KEY'] = 'test-maps-key'

    with patch('backend.routes.location.http_requests.get', return_value=upstream):
        response = client.post(
            '/api/location/geocode',
            json={'address': 'not a real address'},
            headers=auth_headers(app),
        )

    assert response.status_code == 404
    assert response.get_json()['error']['code'] == 'ADDRESS_NOT_FOUND'
