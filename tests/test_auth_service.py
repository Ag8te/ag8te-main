import pytest
from unittest.mock import patch, MagicMock
from backend.services.auth_service import AuthService
from backend.models import User

def test_register_user_success(db_session):
    email = "test@example.com"
    password = "password123"
    role = "client"
    full_name = "Test User"
    
    with patch('backend.services.wallet_service.WalletService.get_or_create_wallet'), \
         patch('backend.utils.auth.create_email_verification_token', return_value="token123"), \
         patch('backend.services.email_service.EmailService.send_verification_email'):
        
        user, error = AuthService.register_user(email, password, role, full_name)
        
        assert error is None
        assert user is not None
        assert user.email == email
        assert user.role == role
        assert user.check_password(password)
        assert user.data['full_name'] == full_name

def test_register_user_exists(db_session):
    email = "existing@example.com"
    role = "client"
    
    # Create existing user
    user = User(email=email, role=role, password_hash="hash")
    db_session.session.add(user)
    db_session.session.commit()
    
    new_user, error = AuthService.register_user(email, "password", role)
    
    assert new_user is None
    assert error == "USER_EXISTS"

def test_login_user_success(db_session):
    email = "test@example.com"
    password = "password123"
    role = "client"
    
    user = User(email=email, role=role, is_active=True, email_verified=True)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()
    
    logged_in_user, error = AuthService.login_user(email, password, role)
    
    assert error is None
    assert logged_in_user.id == user.id

def test_login_user_invalid_credentials(db_session):
    email = "test@example.com"
    password = "wrongpassword"
    role = "client"
    
    user = User(email=email, role=role, is_active=True, email_verified=True)
    user.set_password("correctpassword")
    db_session.session.add(user)
    db_session.session.commit()
    
    logged_in_user, error = AuthService.login_user(email, password, role)
    
    assert logged_in_user is None
    assert error == "INVALID_CREDENTIALS"

def test_login_user_unverified_email(db_session):
    email = "test@example.com"
    password = "password123"
    role = "client"
    
    user = User(email=email, role=role, is_active=True, email_verified=False)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()
    
    logged_in_user, error = AuthService.login_user(email, password, role)
    
    assert logged_in_user is None
    assert error == "EMAIL_NOT_VERIFIED"
