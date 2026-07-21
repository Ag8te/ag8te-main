import pytest
import json
from backend.models import User
from unittest.mock import patch

def test_register_route_success(client, db_session):
    data = {
        "email": "route@example.com",
        "password": "password123",
        "role": "client",
        "full_name": "Route Test"
    }
    
    response = client.post('/api/auth/register', 
                            data=json.dumps(data),
                            content_type='application/json')
    
    assert response.status_code == 201
    res_data = response.get_json()
    assert res_data['success'] is True
    assert res_data['data']['user']['email'] == "route@example.com"
    assert 'token' in res_data['data']

def test_login_route_success(client, db_session):
    # Setup user
    email = "login@example.com"
    password = "password123"
    role = "client"
    
    user = User(email=email, role=role, is_active=True, email_verified=True)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()
    
    data = {
        "email": email,
        "password": password,
        "role": role
    }
    
    with patch("backend.services.email_service.EmailService.send_otp_email"):
        response = client.post('/api/auth/login',
                                data=json.dumps(data),
                                content_type='application/json')
    
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert res_data['data']['otp_required'] is True
    assert res_data['data']['channel'] == 'email'
    assert 'challenge_id' in res_data['data']
    assert 'token' not in res_data['data']

def test_login_route_success_without_role(client, db_session):
    email = "login-no-role@example.com"
    password = "password123"

    user = User(email=email, role="client", is_active=True, email_verified=True)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()

    with patch("backend.services.email_service.EmailService.send_otp_email"):
        response = client.post('/api/auth/login',
                               data=json.dumps({"email": email, "password": password}),
                               content_type='application/json')

    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert res_data['data']['otp_required'] is True
    assert res_data['data']['user']['role'] == "client"

def test_verify_login_otp_issues_token(client, db_session, app):
    email = "otp-login@example.com"
    password = "password123"
    role = "client"

    user = User(email=email, role=role, is_active=True, email_verified=True)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()

    with patch("backend.services.otp_service.OtpService.generate_code", return_value="123456"), \
         patch("backend.services.email_service.EmailService.send_otp_email"):
        login_response = client.post('/api/auth/login',
                                     data=json.dumps({"email": email, "password": password, "role": role}),
                                     content_type='application/json')

    challenge_id = login_response.get_json()['data']['challenge_id']
    response = client.post('/api/auth/verify-login-otp',
                           data=json.dumps({"challenge_id": challenge_id, "code": "123456"}),
                           content_type='application/json')

    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert 'token' in res_data['data']
    assert 'trusted_device_token' not in res_data['data']

def test_login_requires_otp_even_with_legacy_trusted_device_token(client, db_session, app):
    email = "trusted-login@example.com"
    password = "password123"
    role = "client"

    user = User(email=email, role=role, is_active=True, email_verified=True)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()

    with patch("backend.services.otp_service.OtpService.generate_code", return_value="123456"), \
         patch("backend.services.email_service.EmailService.send_otp_email"):
        login_response = client.post('/api/auth/login',
                                     data=json.dumps({"email": email, "password": password, "role": role}),
                                     content_type='application/json')

    challenge_id = login_response.get_json()['data']['challenge_id']
    verify_response = client.post('/api/auth/verify-login-otp',
                                  data=json.dumps({"challenge_id": challenge_id, "code": "123456"}),
                                  content_type='application/json')
    assert verify_response.get_json()['data']['token']

    with patch("backend.services.email_service.EmailService.send_otp_email") as mock_send_otp:
        response = client.post('/api/auth/login',
                               data=json.dumps({
                                   "email": email,
                                   "password": password,
                                   "role": role,
                                   "trusted_device_token": "legacy-token-that-must-not-bypass-otp",
                               }),
                               content_type='application/json')

    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert res_data['data']['otp_required'] is True
    assert 'token' not in res_data['data']
    mock_send_otp.assert_called_once()

def test_admin_login_remains_password_only(client, db_session):
    user = User(
        email="admin-otp-exempt@example.com",
        role="admin",
        is_admin=True,
        is_active=True,
        email_verified=True,
    )
    user.set_password("password123")
    db_session.session.add(user)
    db_session.session.commit()

    with patch("backend.services.email_service.EmailService.send_otp_email") as mock_send_otp:
        response = client.post(
            '/api/auth/admin-login',
            data=json.dumps({"email": user.email, "password": "password123"}),
            content_type='application/json',
        )

    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert 'token' in res_data['data']
    assert 'otp_required' not in res_data['data']
    mock_send_otp.assert_not_called()

def test_login_route_unpaid_non_client_continues_when_fee_is_free(client, db_session):
    email = "driver-login@example.com"
    password = "password123"
    role = "driver"

    user = User(email=email, role=role, is_active=True, email_verified=True, is_paid=False)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()

    data = {
        "email": email,
        "password": password,
        "role": role
    }

    with patch("backend.routes.auth.OtpService.create_email_login_challenge") as mock_challenge:
        mock_challenge.return_value.id = "challenge-id"
        mock_challenge.return_value.expires_at = None
        response = client.post('/api/auth/login',
                               data=json.dumps(data),
                               content_type='application/json')

    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert res_data['data']['otp_required'] is True
    assert res_data['data']['challenge_id'] == "challenge-id"
    assert 'token' not in res_data['data']
    db_session.session.refresh(user)
    assert user.is_paid is True

def test_register_route_validation_error(client, db_session):
    # Missing password
    data = {
        "email": "short@example.com",
        "role": "client"
    }
    
    response = client.post('/api/auth/register',
                            data=json.dumps(data),
                            content_type='application/json')
    
    assert response.status_code == 400
    res_data = response.get_json()
    assert res_data['success'] is False
    assert res_data['error']['code'] == 'VALIDATION_ERROR'
