import logging
import os
import sys
from flask import Flask, jsonify, request
from flask_migrate import Migrate
from flask_cors import CORS
from backend.extensions import db, jwt, mail, login_manager
from backend.config import Config
from backend.utils.middleware import setup_error_handlers, request_trace_middleware, RequestIdFilter

def validate_config(app):
    """Validate critical configuration variables on startup."""
    required_vars = [
        'DATABASE_URL',
        'SECRET_KEY',
        'JWT_SECRET_KEY'
    ]
    missing = [var for var in required_vars if not os.environ.get(var) and not app.config.get(var)]
    
    if missing:
        app.logger.error(f"Missing critical environment variables: {', '.join(missing)}")
        if app.config.get('FLASK_ENV') == 'production':
            raise RuntimeError(f"Cannot start in production without: {', '.join(missing)}")

def _configure_logging(app):
    """Configure structured logging with request IDs."""
    log_level = getattr(logging, (os.environ.get('LOG_LEVEL') or 'INFO').upper(), logging.INFO)
    
    # Standard stderr for Docker
    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(log_level)
    
    # Request ID filter
    request_id_filter = RequestIdFilter()
    handler.addFilter(request_id_filter)
    
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s [%(name)s] [%(request_id)s] %(message)s'
    )
    handler.setFormatter(formatter)
    
    root = logging.getLogger()
    root.handlers = []
    root.addHandler(handler)
    root.setLevel(log_level)
    
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    
    app.logger.info(f"Logging configured at level {logging.getLevelName(log_level)}")

def create_app(config_class=Config):
    """Create and configure Flask application"""
    app = Flask(__name__,
                static_folder='static',
                static_url_path='/static',
                template_folder='templates')
    
    app.config.from_object(config_class)
    _configure_logging(app)
    validate_config(app)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    login_manager.init_app(app)
    Migrate(app, db)
    
    request_trace_middleware(app)
    setup_error_handlers(app)
    
    from backend.cli import cli
    app.cli.add_command(cli)

    from backend.seed_all import seed_all
    app.cli.add_command(seed_all)
    
    from backend.routes import (
        auth, requests, payments, shop, admin, dashboard, 
        location, profile, address, faq, drivers, clients, 
        public, chat, reports, ads, emergency, notifications
    )
    
    blueprints = [
        (public.bp, '/api/public'),
        (auth.bp, '/api/auth'),
        (requests.bp, '/api/requests'),
        (drivers.bp, '/api/drivers'),
        (clients.bp, '/api/clients'),
        (payments.bp, '/api/payments'),
        (shop.bp, '/api/shop'),
        (admin.bp, '/api/admin'),
        (dashboard.bp, '/api/dashboard'),
        (location.bp, '/api/location'),
        (profile.bp, '/api/profile'),
        (address.bp, '/api/addresses'),
        (faq.bp, '/api/faq'),
        (chat.bp, '/api/chat'),
        (reports.bp, '/api/reports'),
        (ads.bp, '/api/ads'),
        (emergency.bp, '/api/emergency'),
        (notifications.bp, '/api/notifications')
    ]
    
    for bp, prefix in blueprints:
        app.register_blueprint(bp, url_prefix=prefix)

    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'environment': app.config.get('FLASK_ENV'),
            'version': '1.1.0'
        })
    
    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5006))
    app.run(host='0.0.0.0', port=port, debug=True)
