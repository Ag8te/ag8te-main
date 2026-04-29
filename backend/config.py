"""
Flask Configuration
"""
import os
from datetime import timedelta

class Config:
    """Base configuration"""
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://mzansi:changeme@localhost:5432/mzansiserve'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
    }
    
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_ALGORITHM = 'HS256'
    
    # Flask-Mail
    MAIL_SERVER = os.environ.get('SMTP_HOST') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('SMTP_PORT') or 587)
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('SMTP_USER')
    MAIL_PASSWORD = os.environ.get('SMTP_PASSWORD')
    DEFAULT_FROM_NAME = os.environ.get('DEFAULT_FROM_NAME') or 'Mzansi Serve'
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL') or 'noreply@mzansiserve.co.za'
    DEFAULT_REPLY_TO_EMAIL = os.environ.get('DEFAULT_REPLY_TO_EMAIL') or DEFAULT_FROM_EMAIL
    SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL') or 'support@mzansiserve.co.za'
    
    # Payments
    PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
    PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET')
    PAYPAL_API_URL = os.environ.get('PAYPAL_API_URL') or 'https://api-m.sandbox.paypal.com'
    PAYPAL_MODE = os.environ.get('PAYPAL_MODE') or 'sandbox'
    YOCO_SECRET_KEY = os.environ.get('YOCO_SECRET_KEY')
    YOCO_API_URL = os.environ.get('YOCO_API_URL') or 'https://payments.yoco.com'
    
    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB
    
    # Application
    FLASK_ENV = os.environ.get('FLASK_ENV') or 'development'
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG') == '1'

    FRONTEND_URL = os.environ.get('FRONTEND_URL') or ('https://mzansiserve.co.za' if FLASK_ENV == 'production' else 'http://localhost:8080')
    BACKEND_URL = os.environ.get('BACKEND_URL') or ('https://mzansiserve.co.za' if FLASK_ENV == 'production' else 'http://localhost:5006')

    # Google Maps
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY') or ''
    # Aura Integration
    AURA_CLIENT_ID = os.environ.get('AURA_CLIENT_ID')
    AURA_SECRET_KEY = os.environ.get('AURA_SECRET_KEY')
    AURA_BASE_URL = os.environ.get('AURA_BASE_URL') or 'https://panic.aura.services/panic-api/v2'
