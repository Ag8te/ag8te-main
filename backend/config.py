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
    BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
    BREVO_API_URL = os.environ.get('BREVO_API_URL') or 'https://api.brevo.com/v3'
    BREVO_SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL') or DEFAULT_FROM_EMAIL
    BREVO_SENDER_NAME = os.environ.get('BREVO_SENDER_NAME') or DEFAULT_FROM_NAME
    OTP_SECRET_KEY = os.environ.get('OTP_SECRET_KEY') or JWT_SECRET_KEY
    OTP_LOGIN_EXPIRES_MINUTES = int(os.environ.get('OTP_LOGIN_EXPIRES_MINUTES') or 10)
    OTP_TRUSTED_DEVICE_DAYS = int(os.environ.get('OTP_TRUSTED_DEVICE_DAYS') or 7)
    OTP_SENSITIVE_EXPIRES_MINUTES = int(os.environ.get('OTP_SENSITIVE_EXPIRES_MINUTES') or 10)
    OTP_MAX_ATTEMPTS = int(os.environ.get('OTP_MAX_ATTEMPTS') or 5)
    FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID')
    
    # Payments
    PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
    PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET')
    PAYPAL_API_URL = os.environ.get('PAYPAL_API_URL') or 'https://api-m.sandbox.paypal.com'
    PAYPAL_MODE = os.environ.get('PAYPAL_MODE') or 'sandbox'
    YOCO_SECRET_KEY = os.environ.get('YOCO_SECRET_KEY')
    YOCO_API_URL = os.environ.get('YOCO_API_URL') or 'https://payments.yoco.com'
    SHIPLOGIC_ENABLED = (os.environ.get('SHIPLOGIC_ENABLED') or '').lower() in ('1', 'true', 'yes', 'on')
    SHIPLOGIC_API_KEY = os.environ.get('SHIPLOGIC_API_KEY')
    SHIPLOGIC_API_URL = os.environ.get('SHIPLOGIC_API_URL') or 'https://api.shiplogic.com'
    SHIPLOGIC_COLLECTION_COMPANY = os.environ.get('SHIPLOGIC_COLLECTION_COMPANY')
    SHIPLOGIC_COLLECTION_NAME = os.environ.get('SHIPLOGIC_COLLECTION_NAME')
    SHIPLOGIC_COLLECTION_PHONE = os.environ.get('SHIPLOGIC_COLLECTION_PHONE')
    SHIPLOGIC_COLLECTION_EMAIL = os.environ.get('SHIPLOGIC_COLLECTION_EMAIL')
    SHIPLOGIC_COLLECTION_STREET_ADDRESS = os.environ.get('SHIPLOGIC_COLLECTION_STREET_ADDRESS')
    SHIPLOGIC_COLLECTION_LOCAL_AREA = os.environ.get('SHIPLOGIC_COLLECTION_LOCAL_AREA')
    SHIPLOGIC_COLLECTION_CITY = os.environ.get('SHIPLOGIC_COLLECTION_CITY')
    SHIPLOGIC_COLLECTION_ZONE = os.environ.get('SHIPLOGIC_COLLECTION_ZONE')
    SHIPLOGIC_COLLECTION_CODE = os.environ.get('SHIPLOGIC_COLLECTION_CODE')
    SHIPLOGIC_COLLECTION_COUNTRY = os.environ.get('SHIPLOGIC_COLLECTION_COUNTRY') or 'ZA'
    SHIPLOGIC_DEFAULT_PARCEL_DESCRIPTION = os.environ.get('SHIPLOGIC_DEFAULT_PARCEL_DESCRIPTION') or 'General goods'
    SHIPLOGIC_DEFAULT_WEIGHT_KG = float(os.environ.get('SHIPLOGIC_DEFAULT_WEIGHT_KG') or 1.0)
    SHIPLOGIC_DEFAULT_LENGTH_CM = float(os.environ.get('SHIPLOGIC_DEFAULT_LENGTH_CM') or 30.0)
    SHIPLOGIC_DEFAULT_WIDTH_CM = float(os.environ.get('SHIPLOGIC_DEFAULT_WIDTH_CM') or 25.0)
    SHIPLOGIC_DEFAULT_HEIGHT_CM = float(os.environ.get('SHIPLOGIC_DEFAULT_HEIGHT_CM') or 20.0)
    SHIPLOGIC_MAX_WEIGHT_PER_PARCEL_KG = float(os.environ.get('SHIPLOGIC_MAX_WEIGHT_PER_PARCEL_KG') or 25.0)
    SHIPLOGIC_SHIPPING_MARKUP_TYPE = os.environ.get('SHIPLOGIC_SHIPPING_MARKUP_TYPE') or 'flat'
    SHIPLOGIC_SHIPPING_MARKUP_VALUE = float(os.environ.get('SHIPLOGIC_SHIPPING_MARKUP_VALUE') or 0.0)
    SHIPLOGIC_AUTOMATIC_SHIPMENT_CREATION = (os.environ.get('SHIPLOGIC_AUTOMATIC_SHIPMENT_CREATION') or 'true').lower() in ('1', 'true', 'yes', 'on')
    
    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    MAX_UPLOAD_SIZE = 16 * 1024 * 1024  # 16MB
    
    # Application
    FLASK_ENV = os.environ.get('FLASK_ENV') or 'development'
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG') == '1'

    FRONTEND_URL = os.environ.get('FRONTEND_URL') or ('https://mzansiserve.co.za' if FLASK_ENV == 'production' else 'http://localhost:8080')
    BACKEND_URL = os.environ.get('BACKEND_URL') or ('https://mzansiserve.co.za' if FLASK_ENV == 'production' else 'http://localhost:5006')
    MOBILE_APP_URL = os.environ.get('MOBILE_APP_URL') or 'co.za.mzansiserve.app://app'

    # Google Maps
    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY') or ''
    # Aura Integration
    AURA_CLIENT_ID = os.environ.get('AURA_CLIENT_ID')
    AURA_SECRET_KEY = os.environ.get('AURA_SECRET_KEY')
    AURA_BASE_URL = os.environ.get('AURA_BASE_URL') or 'https://panic.aura.services/panic-api/v2'
