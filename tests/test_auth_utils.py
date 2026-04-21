from backend.models import User, PasswordResetToken
from backend.utils.auth import create_password_reset_token


def test_create_password_reset_token_invalidates_older_unused_tokens(db_session):
    user = User(email="reset@example.com", role="client", is_active=True, email_verified=True)
    user.set_password("password123")
    db_session.session.add(user)
    db_session.session.commit()

    first_token = create_password_reset_token(user.id)
    second_token = create_password_reset_token(user.id)

    first_record = PasswordResetToken.query.filter_by(token=first_token).first()
    second_record = PasswordResetToken.query.filter_by(token=second_token).first()

    assert first_record is not None
    assert second_record is not None
    assert first_record.used is True
    assert second_record.used is False
    assert first_token != second_token
