import pytest
import json
from backend.models import User

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
    
    response = client.post('/api/auth/login',
                            data=json.dumps(data),
                            content_type='application/json')
    
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data['success'] is True
    assert 'token' in res_data['data']

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
