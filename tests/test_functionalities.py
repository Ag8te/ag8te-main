import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch
from backend.models import (
    Inventory,
    Order,
    Payment,
    ServiceRequest,
    ShopProduct,
    User,
    Wallet,
    WithdrawalRequest,
)
from backend.extensions import db
from backend.services.auth_service import AuthService
from backend.services.payment_service import PaymentService

def get_auth_header(client, email, password, role):
    endpoint = '/api/auth/admin-login' if role == 'admin' else '/api/auth/login'
    login_data = {"email": email, "password": password}
    if role != 'admin':
        login_data["role"] = role

    if role == 'admin':
        response = client.post(endpoint,
                               data=json.dumps(login_data),
                               content_type='application/json')
    else:
        with patch("backend.services.otp_service.OtpService.generate_code", return_value="123456"), \
             patch("backend.services.email_service.EmailService.send_otp_email"):
            response = client.post(endpoint,
                                   data=json.dumps(login_data),
                                   content_type='application/json')

    data = response.get_json()
    if 'data' not in data:
        raise ValueError(f"Login failed for {email} ({role}): {data}")
    if data['data'].get('otp_required'):
        response = client.post('/api/auth/verify-login-otp',
                               data=json.dumps({
                                   "challenge_id": data['data']['challenge_id'],
                                   "code": "123456"
                               }),
                               content_type='application/json')
        data = response.get_json()
        if 'data' not in data:
            raise ValueError(f"OTP verification failed for {email} ({role}): {data}")
    return {'Authorization': f"Bearer {data['data']['token']}"}

def create_admin(db_session):
    admin = User.query.filter_by(email="admin@ag8te.com", role="admin").first()
    if admin:
        return admin
        
    admin = User(
        email="admin@ag8te.com", 
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

def make_driver_approval_ready(user):
    future_date = (datetime.utcnow() + timedelta(days=365)).date().isoformat()
    driver_data = dict(user.data or {})
    driver_data.update({
        "driver_license_number": "DL-TEST-12345",
        "driver_license_code": "B",
        "driver_license_expiry": future_date,
        "prdp_number": "PRDP-TEST-12345",
        "prdp_expiry": future_date,
        "banking_details": {
            "bank_name": "Test Bank",
            "account_holder": "Wallet Driver",
            "account_number": "1234567890",
            "branch_code": "250655",
        },
        "proof_of_residence_url": "/uploads/tests/proof-of-residence.pdf",
        "driver_license_url": "/uploads/tests/drivers-license.pdf",
        "prdp_document_url": "/uploads/tests/prdp-document.pdf",
        "vehicle_disk_document_url": "/uploads/tests/vehicle-disk.pdf",
        "vehicle_disk_expiry": future_date,
        "driver_services": [
            {
                "car_make": "Toyota",
                "car_model": "Corolla",
                "car_year": "2024",
                "registration_number": "TEST123GP",
                "car_type": "sedan",
                "color": "White",
                "seats": 4,
                "images": [
                    "/uploads/tests/vehicle-1.jpg",
                    "/uploads/tests/vehicle-2.jpg",
                    "/uploads/tests/vehicle-3.jpg",
                ],
                "disk_document": "/uploads/tests/vehicle-disk.pdf",
                "disk_expiry": future_date,
            }
        ],
    })
    user.data = driver_data

def test_1_2_3_registration_approval_login(client, app, db_session):
    roles = ['client', 'driver', 'professional', 'service-provider']
    password = "password123"
    
    admin = create_admin(db_session)
    admin_headers = get_auth_header(client, admin.email, "admin123", "admin")
    
    for role in roles:
        email = f"gaulomail+{role}@gmail.com"
        # 1. Registration
        with patch('backend.services.email_service.EmailService.send_email') as mock_send:
            mock_send.return_value = True
            
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
                if role != 'client':
                    u.is_paid = True
                if role == 'driver':
                    make_driver_approval_ready(u)
                elif role == 'professional':
                    u.data = {"professional_services": [{"name": "Web Design", "hourly_rate": 500}]}
                elif role == 'service-provider':
                    u.data = {"provider_services": [{"name": "Cleaning", "description": "Home cleaning"}]}
                db_session.session.commit()
            
        # 2. Approval
        if role != 'client':
            app_res = client.patch(f'/api/admin/users/{user_id}/approve', headers=admin_headers)
            assert app_res.status_code == 200, f"Approval failed for {role}: {app_res.get_json()}"
            
        # 3. Login
        with patch('backend.services.email_service.EmailService.send_otp_email'):
            login_res = client.post('/api/auth/login',
                                    data=json.dumps({"email": email, "password": password, "role": role}),
                                    content_type='application/json')
        assert login_res.status_code == 200
        assert login_res.get_json()['data']['otp_required'] is True

def test_4_5_6_request_flows(client, app, db_session):
    admin = create_admin(db_session)
    client_email = "gaulomail+client_req@gmail.com"
    client_pass = "pass1234"
    
    with patch('backend.services.email_service.EmailService.send_email') as mock_send:
        mock_send.return_value = True
        
        res = client.post('/api/auth/register', data=json.dumps({
            "email": client_email, "password": client_pass, "role": "client", "full_name": "Req Client"
        }), content_type='application/json')
        assert res.status_code == 201, f"Registration failed: {res.get_json()}"
    
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
    
    with patch('backend.services.email_service.EmailService.send_email') as mock_send:
        mock_send.return_value = True
        
        res = client.post('/api/auth/register', data=json.dumps({
            "email": driver_email, "password": driver_pass, "role": "driver", "full_name": "Wallet Driver"
        }), content_type='application/json')
        assert res.status_code == 201, f"Registration failed: {res.get_json()}"
        user_id = res.get_json()['data']['user']['id']
    
    admin = create_admin(db_session)
    admin_headers = get_auth_header(client, admin.email, "admin123", "admin")
    
    with app.app_context():
        u = User.query.get(user_id)
        u.email_verified = True
        u.is_paid = True
        make_driver_approval_ready(u)
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
    
    with patch('backend.services.email_service.EmailService.send_email') as mock_send:
        mock_send.return_value = True
        
        res = client.post('/api/auth/register', data=json.dumps({
            "email": client_email, "password": client_pass, "role": "client", "full_name": "Shop Client"
        }), content_type='application/json')
        assert res.status_code == 201, f"Registration failed: {res.get_json()}"
    
    with app.app_context():
        u = User.query.filter_by(email=client_email).first()
        u.email_verified = True
        db_session.session.commit()
        
    client_headers = get_auth_header(client, client_email, client_pass, "client")

    with app.app_context():
        product = ShopProduct(
            id="item1",
            name="Tool",
            price=100.0,
            status="active",
            product_type="simple",
            in_stock=True,
        )
        inventory = Inventory(
            id="INV-ITEM1",
            product_id=product.id,
            quantity=1,
            reserved_quantity=0,
        )
        db_session.session.add_all([product, inventory])
        db_session.session.commit()
    
    # Mock the route-level PaymentService reference used by create_order.
    with patch('backend.routes.payments.PaymentService.create_checkout') as mock_checkout:
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

        with app.app_context():
            inventory = Inventory.query.filter_by(product_id="item1").one()
            assert inventory.reserved_quantity == 1

        # 18. Issue Invoice
        inv_res = client.get(f'/api/shop/orders/{order_id}/invoice', headers=client_headers)
        assert inv_res.status_code == 200
        assert inv_res.content_type == 'application/pdf'

def test_order_payment_callback_marks_yoco_payment_paid_when_provider_status_lags(client, app, db_session):
    with app.app_context():
        user = User(
            email="gaulomail+ordercallback@gmail.com",
            role="client",
            is_active=True,
            email_verified=True
        )
        user.set_password("pass1234")
        db.session.add(user)
        db.session.flush()

        order = Order(
            id="ORD-CALLBACK01",
            customer_id=user.id,
            customer_email=user.email,
            status="pending",
            total=100.0,
            items=[{"product_id": "prod_1", "product_name": "Tool", "quantity": 1, "price": 100.0}],
            shipping={"address": "123 Main St"}
        )
        payment = Payment(
            external_id=order.id,
            amount=100.0,
            currency="ZAR",
            status="pending",
            payment_method="yoco",
            payment_provider_id="checkout_123"
        )
        db.session.add(order)
        db.session.add(payment)
        db.session.commit()

        success, error = PaymentService.handle_order_payment(order.id, order.id, callback_status="success")
        assert success is True
        assert error is None

        db.session.refresh(order)
        db.session.refresh(payment)
        assert order.status == "paid"
        assert payment.status == "completed"

def test_update_payment_status_normalizes_paid_alias(client, app, db_session):
    with app.app_context():
        payment = Payment(
            external_id="alias_status_1",
            amount=50.0,
            currency="ZAR",
            status="pending",
            payment_method="yoco",
            payment_provider_id="checkout_alias_1"
        )
        db.session.add(payment)
        db.session.commit()

        assert PaymentService.update_payment_status("alias_status_1", "paid", {"source": "webhook"}) is True

        db.session.refresh(payment)
        assert payment.status == "completed"

def test_7_19_booking_reject_certificate(client, app, db_session):
    # Setup client and provider
    client_email = "gaulomail+client_cert@gmail.com"
    prof_email = "gaulomail+prof_cert@gmail.com"
    client_pass = "pass1234"
    
    # Register client and professional with email mocking
    with patch('backend.services.email_service.EmailService.send_email') as mock_send:
        mock_send.return_value = True
        
        res1 = client.post('/api/auth/register', data=json.dumps({"email": client_email, "password": client_pass, "role": "client", "full_name": "Cert Client"}), content_type='application/json')
        assert res1.status_code == 201, f"Client registration failed: {res1.get_json()}"
        
        # Register professional
        res2 = client.post('/api/auth/register', data=json.dumps({"email": prof_email, "password": client_pass, "role": "professional", "full_name": "Cert Prof"}), content_type='application/json')
        assert res2.status_code == 201, f"Professional registration failed: {res2.get_json()}"
    
    with app.app_context():
        c_user = User.query.filter_by(email=client_email).first()
        p_user = User.query.filter_by(email=prof_email).first()
        c_user.email_verified = True
        p_user.email_verified = True
        p_user.is_paid = True
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
