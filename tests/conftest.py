import pytest
import os
import sys
import sqlalchemy as sa
from sqlalchemy.types import TypeDecorator, CHAR, TEXT
from sqlalchemy.dialects import postgresql
import json

# Add project root to sys.path to allow importing 'app' and other modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock PostgreSQL types for SQLite compatibility
class SQLiteJSONB(TypeDecorator):
    impl = TEXT
    def __init__(self, *args, **kwargs):
        super().__init__()

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return json.dumps(value)
    def process_result_value(self, value, dialect):
        if value is None: return None
        return json.loads(value)

class SQLiteUUID(TypeDecorator):
    impl = CHAR(36)
    def __init__(self, *args, **kwargs):
        super().__init__()

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return str(value)
    def process_result_value(self, value, dialect):
        return value

class SQLiteCITEXT(TypeDecorator):
    impl = TEXT
    def __init__(self, *args, **kwargs):
        super().__init__()

# Patch the postgresql dialect module
postgresql.JSONB = SQLiteJSONB
postgresql.UUID = SQLiteUUID
postgresql.CITEXT = SQLiteCITEXT

from backend.config import Config
# Force empty engine options for testing to avoid pool_size error in SQLite
Config.SQLALCHEMY_ENGINE_OPTIONS = {}

from app import create_app
from backend.extensions import db
from backend.config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {}
    WTF_CSRF_ENABLED = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret-key'
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL') or 'test@mzansiserve.co.za'
    MAIL_SERVER = os.environ.get('SMTP_HOST') or 'localhost'
    MAIL_PORT = int(os.environ.get('SMTP_PORT') or 1025)
    MAIL_USE_TLS = os.environ.get('SMTP_USE_TLS') == 'True' or MAIL_PORT == 587
    MAIL_USERNAME = os.environ.get('SMTP_USER') or 'test@localhost'
    MAIL_PASSWORD = os.environ.get('SMTP_PASSWORD') or 'password'

@pytest.fixture(scope='session')
def app():
    app = create_app(TestConfig)
    return app

@pytest.fixture(scope='session')
def client(app):
    return app.test_client()

@pytest.fixture(scope='function')
def db_session(app):
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()
