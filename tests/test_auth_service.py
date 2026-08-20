import pytest
from unittest.mock import patch, MagicMock
from backend.services.auth_service import AuthService
from backend.services.email_service import EmailService
from backend.services.profile_service import ProfileService
from backend.models import EmailQueue, User

def test_register_user_success(db_session):
    email = "test@example.com"
    password = "password123"
    role = "client"
    full_name = "Test User"
    
    with patch('backend.services.wallet_service.WalletService.get_or_create_wallet'), \
         patch('backend.services.auth_service.create_email_verification_token', return_value="token123"), \
         patch('backend.services.auth_service.EmailService.send_client_registration_verification') as send_verification:
        
        user, error = AuthService.register_user(email, password, role, full_name)
        
        assert error is None
        assert user is not None
        assert user.email == email
        assert user.role == role
        assert user.check_password(password)
        assert user.data['full_name'] == full_name
        send_verification.assert_called_once_with(user, "token123")


def test_client_registration_email_does_not_defer_details_to_profile(db_session):
    user = User(email="client-verification@example.com", role="client", data={"full_name": "Client User"})
    user.set_password("password123")
    db_session.session.add(user)
    db_session.session.commit()

    with patch('backend.services.email_service.EmailService.send_email'):
        EmailService.send_client_registration_verification(user, "token123")

    queued_email = EmailQueue.query.filter_by(recipient=user.email).order_by(EmailQueue.created_at.desc()).first()
    assert "/verify-email?token=token123" in queued_email.body
    assert "next=/profile" not in queued_email.body
    assert "complete your personal information" not in queued_email.body
    assert "verification documents were submitted" not in queued_email.body


def test_client_registration_persists_personal_details_without_documents(db_session):
    registration_data = {
        "email": "complete-client@example.com",
        "password": "password123",
        "role": "client",
        "full_name": "Complete",
        "surname": "Client",
        "phone": "+27820000000",
        "gender": "female",
        "nationality": "South Africa",
        "id_number": "9001010000080",
        "next_of_kin": {
            "full_name": "Kin Person",
            "contact_number": "+27821111111",
            "contact_email": "kin@example.com",
        },
    }
    stale_client_files = {
        "profile_photo": MagicMock(name="profile_photo"),
        "id_document": MagicMock(name="id_document"),
    }

    with patch('backend.services.auth_service.WalletService.get_or_create_wallet'), \
         patch('backend.services.auth_service.AuthService._send_registration_email'), \
         patch.object(AuthService, 'handle_file_upload') as handle_file_upload:
        user, error = AuthService.register_with_payment_logic(registration_data, stale_client_files)

    assert error is None
    assert user.nationality == "South Africa"
    assert user.data["id_number"] == "9001010000080"
    assert user.data["sa_id"] == "9001010000080"
    assert user.data["next_of_kin"]["full_name"] == "Kin Person"
    assert user.file_urls in (None, [])
    assert user.profile_image_url is None
    handle_file_upload.assert_not_called()


def test_client_can_upload_id_document_from_profile(db_session):
    user = User(email="client-document@example.com", role="client", data={"full_name": "Client"})
    user.set_password("password123")
    user.id_verification_status = "rejected"
    user.id_rejection_reason = "Previous image was unclear"
    db_session.session.add(user)
    db_session.session.commit()

    document = MagicMock()
    document.filename = "identity.pdf"

    document_url, error = ProfileService.upload_client_id_document(user.id, document)

    assert error is None
    assert document_url.startswith("/uploads/id_")
    assert document_url.endswith(".pdf")
    document.save.assert_called_once()

    db_session.session.refresh(user)
    assert user.file_urls == [document_url]
    assert user.id_verification_status == "pending"
    assert user.id_rejection_reason is None


def test_non_client_registration_sends_next_steps_email(db_session):
    with patch('backend.services.auth_service.WalletService.get_or_create_wallet'), \
         patch('backend.services.auth_service.EmailService.send_registration_confirmation') as send_confirmation:
        user, error = AuthService.register_user(
            "driver-registration@example.com", "password123", "driver", "Test Driver"
        )

    assert error is None
    send_confirmation.assert_called_once_with(user)

    with patch('backend.services.email_service.EmailService.send_email'):
        EmailService.send_registration_confirmation(user)

    queued_email = EmailQueue.query.filter_by(recipient=user.email).order_by(EmailQueue.created_at.desc()).first()
    assert queued_email.subject == "Registration Received - Next Steps for AG8TE"
    assert "not active yet" in queued_email.body
    assert "registration fee is currently free" in queued_email.body


def test_otp_email_raises_when_delivery_fails(db_session):
    user = User(email="otp-delivery@example.com", role="client", data={"full_name": "OTP User"})
    user.set_password("password123")
    db_session.session.add(user)
    db_session.session.commit()

    with patch('backend.services.email_service.EmailService.send_brevo_email', return_value=False), \
         patch('backend.services.email_service.EmailService.send_email', return_value=False), \
         pytest.raises(RuntimeError, match="OTP email delivery failed"):
        EmailService.send_otp_email(user, "123456")

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

def test_login_user_unverified_email_allowed(db_session):
    email = "test@example.com"
    password = "password123"
    role = "client"
    
    user = User(email=email, role=role, is_active=True, email_verified=False)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()
    
    logged_in_user, error = AuthService.login_user(email, password, role)
    
    assert error is None
    assert logged_in_user.id == user.id

def test_login_user_unpaid_non_client_is_settled_when_fee_is_free(db_session):
    email = "driver@example.com"
    password = "password123"
    role = "driver"

    user = User(email=email, role=role, is_active=True, email_verified=True, is_paid=False)
    user.set_password(password)
    db_session.session.add(user)
    db_session.session.commit()

    logged_in_user, error = AuthService.login_user(email, password, role)

    assert error is None
    assert logged_in_user.id == user.id
    assert logged_in_user.is_paid is True
