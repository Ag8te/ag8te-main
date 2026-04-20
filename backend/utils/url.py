"""Helpers for choosing frontend/backend base URLs per environment."""
from urllib.parse import urlparse

from flask import current_app, has_request_context, request


def _strip_trailing_slash(value: str | None) -> str:
    return (value or "").rstrip("/")


def _config_default_frontend() -> str:
    if current_app.config.get("FLASK_ENV") == "production":
        return "https://mzansiserve.co.za"
    return "http://localhost:8080"


def _config_default_backend() -> str:
    if current_app.config.get("FLASK_ENV") == "production":
        return "https://mzansiserve.co.za"
    return "http://localhost:5006"


def _request_origin_base_url() -> str | None:
    """Best-effort public frontend origin from the active browser request."""
    if not has_request_context():
        return None

    for header_name in ("Origin", "Referer"):
        header_value = request.headers.get(header_name)
        if not header_value:
            continue
        parsed = urlparse(header_value)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    return None


def _request_backend_base_url() -> str | None:
    """Best-effort backend base URL from the active request and proxy headers."""
    if not has_request_context():
        return None

    forwarded_proto = (request.headers.get("X-Forwarded-Proto") or request.scheme or "http").split(",")[0].strip()
    forwarded_host = (request.headers.get("X-Forwarded-Host") or request.headers.get("Host") or "").split(",")[0].strip()
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}"
    return None


def get_public_frontend_base_url() -> str:
    """Frontend URL for emails and other out-of-band links."""
    return _strip_trailing_slash(
        _request_origin_base_url()
        or current_app.config.get("FRONTEND_URL")
        or _config_default_frontend()
    )


def get_public_backend_base_url() -> str:
    """Backend URL for server-side callbacks and out-of-band links."""
    return _strip_trailing_slash(
        _request_backend_base_url()
        or current_app.config.get("BACKEND_URL")
        or _config_default_backend()
    )


def get_request_frontend_base_url() -> str:
    """Best frontend base URL for the current browser-initiated request."""
    return _strip_trailing_slash(_request_origin_base_url() or get_public_frontend_base_url())


def get_callback_frontend_base_url() -> str:
    """Frontend URL for payment callbacks, preferring the encoded source URL."""
    return _strip_trailing_slash(request.args.get("frontend_url")) or get_request_frontend_base_url()
