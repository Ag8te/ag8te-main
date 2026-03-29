import pytest
import json
import uuid
from datetime import datetime
from unittest.mock import patch
from backend.models import User, Wallet, ServiceRequest, WithdrawalRequest, Order, Payment
from backend.services.auth_service import AuthService

def get_auth_header(client, email, password, role):
    endpoint = '/api/auth/admin-login' if role == 'admin' else '/api/auth/login'
    login_data = {"email": email, "password": password}
    if role != 'admin':
        login_data["role"] = role
        
    response = client.post(endpoint,
                            data=json.dumps(login_data),
                            content_type='application/json')
    data = response.get_json()
    if 'data' not in data:
        raise ValueError(f"Login failed for {email} ({role}): {data}")
    return {'Authorization': f"Bearer {data['data']['token']}"}

def create_admin(db_session):
    admin = User.query.filter_by(email="admin@mzansiserve.co.za", role="admin").first()
    if admin:
        return admin
        
    admin = User(
        email="admin@mzansiserve.co.za", 
        role="admin", 
        is_active=True, 
        is_approved=True, 
        email_verified=True,
        is_admin=True
    )
    admin.set_password("admin123")
    db_session.session.add(admin)
    db_session.session.commit()
    return admin

def test_1_2_3_registration_approval_login(client, app, db_session):
    roles = ['client', 'driver', 'professional', 'service-provider']
    password = "password123"
    
    admin = create_admin(db_session)
    admin_headers = get_auth_header(client, admin.email, "admin123", "admin")
    
    for role in roles:
        email = f"gaulomail+{role}@gmail.com"
        # 1. Registration
        reg_data = {
            "email": email,
            "password": password,
            "role": role,
            "full_name": f"Test {role}"
        }
        res = client.post('/api/auth/register', data=json.dumps(reg_data), content_type='application/json')
        res_json = res.get_json()
        assert res.status_code == 201, f"Reg failed for {role}: {res_json}"
        
        user_id = res_json['data']['user']['id']
        
        with app.app_context():
            u = User.query.get(user_id)
            if u:
                u.email_verified = True
                if role == 'professional':
                    u.data = {"professional_services": [{"name": "Web Design", "hourly_rate": 500}]}
                elif role == 'service-provider':
                    u.data = {"provider_services": [{"name": "Cleaning", "description": "Home cleaning"}]}
                db_session.session.commit()
            
        # 2. Approval
        if role != 'client':
            app_res = client.patch(f'/api/admin/users/{user_id}/approve', headers=admin_headers)
            assert app_res.status_code == 200, f"Approval failed for {role}: {app_res.get_json()}"
            
        # 3. Login
        login_res = client.post('/api/auth/login', 
                                data=json.dumps({"email": email, "password": password, "role": role}),
                                content_type='application/json')
        assert login_res.status_code == 200

def test_4_5_6_request_flows(client, app, db_session):
    admin = create_admin(db_session)
    client_email = "gaulomail+client_req@gmail.com"
    client_pass = "pass1234"
    
    client.post('/api/auth/register', data=json.dumps({
        "email": client_email, "password": client_pass, "role": "client", "full_name": "Req Client"
    }), content_type='application/json')
    
    with app.app_context():
        u = User.query.filter_by(email=client_email).first()
        if u:
            u.email_verified = True
            db_session.session.commit()
            
    client_headers = get_auth_header(client, client_email, client_pass, "client")
    
    # 6. Cab Quote
    quote_data = {
        "type": "cab",
        "pickup": {"lat": -26.2041, "lng": 28.0473, "address": "Point A"},
        "dropoff": {"lat": -26.1952, "lng": 28.0341, "address": "Point B"}
    }
    res_quote = client.post('/api/requests/quote', 
                            data=json.dumps(quote_data), 
                            headers=client_headers,
                            content_type='application/json')
    assert res_quote.status_code == 200
    
def test_12_wallet_withdrawal(client, app, db_session):
    driver_email = "gaulomail+driver_reg@gmail.com"
    driver_pass = "pass1234"
    res = client.post('/api/auth/register', data=json.dumps({
        "email": driver_email, "password": driver_pass, "role": "driver", "full_name": "Wallet Driver"
    }), content_type='application/json')
    user_id = res.get_json()['data']['user']['id']
    
    admin = create_admin(db_session)
    admin_headers = get_auth_header(client, admin.email, "admin123", "admin")
    
    with app.app_context():
        u = User.query.get(user_id)
        u.email_verified = True
        db_session.session.commit()
    client.patch(f'/api/admin/users/{user_id}/approve', headers=admin_headers)
    
    driver_headers = get_auth_header(client, driver_email, driver_pass, "driver")
    
    with app.app_context():
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0.0)
            db_session.session.add(wallet)
        wallet.balance = 1000.0
        db_session.session.commit()
    
    wd_res = client.post('/api/dashboard/wallet/withdrawal-request',
                         data=json.dumps({"amount": 200.0}),
                         headers=driver_headers,
                         content_type='application/json')
    assert wd_res.status_code == 201
    wd_id = wd_res.get_json()['data']['id']
    
    app_res = client.patch(f'/api/admin/withdrawal-requests/{wd_id}', 
                           data=json.dumps({"status": "paid", "admin_notes": "Paid via test"}),
                           headers=admin_headers,
                           content_type='application/json')
    assert app_res.status_code == 200
    
def test_15_16_shop_purchases(client, app, db_session):
    client_email = "gaulomail+shop@gmail.com"
    client_pass = "pass1234"
    client.post('/api/auth/register', data=json.dumps({
        "email": client_email, "password": client_pass, "role": "client", "full_name": "Shop Client"
    }), content_type='application/json')
    
    with app.app_context():
        u = User.query.filter_by(email=client_email).first()
        u.email_verified = True
        db_session.session.commit()
        
    client_headers = get_auth_header(client, client_email, client_pass, "client")
    
    # Mock PaymentService.create_checkout
    with patch('backend.services.payment_service.PaymentService.create_checkout') as mock_checkout:
        mock_checkout.return_value = {
            'checkout_id': 'test_checkout_id',
            'redirect_url': 'https://example.com/checkout',
            'payment_id': 'test_payment_id'
        }
        
        order_data = {
            "items": [{"id": "item1", "name": "Tool", "price": 100.0, "quantity": 1}], 
            "total": 100.0,
            "shipping_address": "123 Main St, Johannesburg",
            "provider": "yoco"
        }
        res_order = client.post('/api/payments/create-order', 
                                data=json.dumps(order_data), 
                                headers=client_headers,
                                content_type='application/json')
        assert res_order.status_code == 200
        assert res_order.get_json()['data']['order_id'].startswith('ORD-')
        order_id = res_order.get_json()['data']['order_id']

        # 18. Issue Invoice
        inv_res = client.get(f'/api/shop/orders/{order_id}/invoice', headers=client_headers)
        assert inv_res.status_code == 200
        assert inv_res.content_type == 'application/pdf'

def test_7_19_booking_reject_certificate(client, app, db_session):
    # Setup client and provider
    client_email = "gaulomail+client_cert@gmail.com"
    prof_email = "gaulomail+prof_cert@gmail.com"
    client_pass = "pass1234"
    
    # Register client
    client.post('/api/auth/register', data=json.dumps({"email": client_email, "password": client_pass, "role": "client", "full_name": "Cert Client"}), content_type='application/json')
    # Register professional
    client.post('/api/auth/register', data=json.dumps({"email": prof_email, "password": client_pass, "role": "professional", "full_name": "Cert Prof"}), content_type='application/json')
    
    with app.app_context():
        c_user = User.query.filter_by(email=client_email).first()
        p_user = User.query.filter_by(email=prof_email).first()
        c_user.email_verified = True
        p_user.email_verified = True
        p_user.is_approved = True
        db_session.session.commit()
        p_id = p_user.id
        
    client_headers = get_auth_header(client, client_email, client_pass, "client")
    prof_headers = get_auth_header(client, prof_email, client_pass, "professional")
    
    # Create request
    req_data = {
        "type": "professional",
        "location": {"lat": 0, "lng": 0, "address": "Test Loc"},
        "date": "2026-04-01",
        "time": "10:00",
        "payment_amount": 100.0
    }
    res_req = client.post('/api/requests', data=json.dumps(req_data), headers=client_headers, content_type='application/json')
    req_id = res_req.get_json()['data']['id']
    
    # Simulate payment completion
    with app.app_context():
        r = ServiceRequest.query.get(req_id)
        r.status = 'pending'
        r.payment_status = 'paid'
        db_session.session.commit()
        
    # 7. Accept and then Reject
    client.post(f'/api/requests/{req_id}/accept', headers=prof_headers)
    
    with app.app_context():
        r = ServiceRequest.query.get(req_id)
        assert r.status == 'accepted'
        
    rej_res = client.post(f'/api/requests/{req_id}/reject', headers=prof_headers)
    assert rej_res.status_code == 200
    
    with app.app_context():
        r = ServiceRequest.query.get(req_id)
        assert r.status == 'pending'
        assert r.provider_id is None
        
    # 19. Certificate
    # Re-accept and mark completed
    client.post(f'/api/requests/{req_id}/accept', headers=prof_headers)
    with app.app_context():
        r = ServiceRequest.query.get(req_id)
        r.status = 'completed'
        db_session.session.commit()
        
    cert_res = client.get(f'/api/requests/{req_id}/certificate', headers=client_headers)
    assert cert_res.status_code == 200
    assert cert_res.content_type == 'application/pdf'
