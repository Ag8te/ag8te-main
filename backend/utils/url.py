"""Helpers for choosing frontend/backend base URLs per environment."""
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from flask import current_app, has_request_context, request


def _strip_trailing_slash(value: str | None) -> str:
    return (value or "").rstrip("/")


def _normalize_local_dev_url(value: str | None, fallback: str) -> str | None:
    """Ensure localhost URLs keep the expected dev port when one is omitted."""
    cleaned = _strip_trailing_slash(value)
    if not cleaned:
        return None

    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.hostname:
        return cleaned

    if parsed.hostname in {"localhost", "127.0.0.1"} and parsed.port is None:
        fallback_parsed = urlparse(fallback)
        if fallback_parsed.scheme and fallback_parsed.netloc:
            return f"{parsed.scheme}://{fallback_parsed.netloc}"

    return cleaned


def _prefer_configured_public_url(value: str | None, config_key: str) -> str | None:
    """In production, never leak localhost callback URLs when a public URL is configured."""
    cleaned = _strip_trailing_slash(value)
    if not cleaned:
        return None

    parsed = urlparse(cleaned)
    configured = _strip_trailing_slash(current_app.config.get(config_key))
    configured_parsed = urlparse(configured) if configured else None

    if (
        current_app.config.get("FLASK_ENV") == "production"
        and parsed.hostname in {"localhost", "127.0.0.1"}
        and configured_parsed
        and configured_parsed.scheme
        and configured_parsed.netloc
    ):
        return configured

    return cleaned


def _config_default_frontend() -> str:
    if current_app.config.get("FLASK_ENV") == "production":
        return "https://mzansiserve.co.za"
    return "http://localhost"


def _config_mobile_app_url() -> str:
    return _strip_trailing_slash(
        current_app.config.get("MOBILE_APP_URL") or "co.za.mzansiserve.app://app"
    )


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


def _request_payload_dict() -> dict | None:
    if not has_request_context():
        return None

    payload = request.get_json(silent=True)
    return payload if isinstance(payload, dict) else None


def _is_allowed_frontend_base_url(value: str | None) -> bool:
    cleaned = _strip_trailing_slash(value)
    if not cleaned:
        return False

    parsed = urlparse(cleaned)
    if not parsed.scheme:
        return False

    mobile_parsed = urlparse(_config_mobile_app_url())
    if parsed.scheme == mobile_parsed.scheme and (
        not mobile_parsed.netloc or parsed.netloc == mobile_parsed.netloc
    ):
        return True

    if parsed.scheme not in {"http", "https"}:
        return False

    if parsed.hostname in {"localhost", "127.0.0.1"}:
        return True

    allowed_pairs = set()
    for candidate in (
        current_app.config.get("FRONTEND_URL"),
        _config_default_frontend(),
        _request_origin_base_url(),
    ):
        candidate_parsed = urlparse(_strip_trailing_slash(candidate))
        if candidate_parsed.scheme and candidate_parsed.netloc:
            allowed_pairs.add((candidate_parsed.scheme, candidate_parsed.netloc))

    return (parsed.scheme, parsed.netloc) in allowed_pairs


def _request_frontend_base_url_override() -> str | None:
    if not has_request_context():
        return None

    payload = _request_payload_dict()
    candidates = [
        request.headers.get("X-Frontend-Url"),
        request.args.get("frontend_url"),
        payload.get("frontend_url") if payload else None,
    ]

    for candidate in candidates:
        if _is_allowed_frontend_base_url(candidate):
            return _strip_trailing_slash(candidate)

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
    return _normalize_local_dev_url(
        current_app.config.get("FRONTEND_URL")
        or _prefer_configured_public_url(_request_origin_base_url(), "FRONTEND_URL")
        or _config_default_frontend(),
        _config_default_frontend()
    )


def get_public_backend_base_url() -> str:
    """Backend URL for server-side callbacks and out-of-band links."""
    return _normalize_local_dev_url(
        _prefer_configured_public_url(_request_backend_base_url(), "BACKEND_URL")
        or current_app.config.get("BACKEND_URL")
        or _config_default_backend(),
        _config_default_backend()
    )


def get_request_frontend_base_url() -> str:
    """Best frontend base URL for the current browser-initiated request."""
    return _normalize_local_dev_url(
        _request_frontend_base_url_override()
        or _prefer_configured_public_url(_request_origin_base_url(), "FRONTEND_URL")
        or get_public_frontend_base_url(),
        _config_default_frontend()
    )


def get_callback_frontend_base_url() -> str:
    """Frontend URL for payment callbacks, preferring the encoded source URL."""
    return _normalize_local_dev_url(
        _request_frontend_base_url_override()
        or _prefer_configured_public_url(request.args.get("frontend_url"), "FRONTEND_URL")
        or get_request_frontend_base_url(),
        _config_default_frontend()
    )


def _extract_safe_frontend_return_path(value: str | None, fallback: str = "/") -> str:
    """Keep only same-site frontend paths so payment callbacks can't redirect off-site."""
    cleaned = (value or "").strip()
    if not cleaned:
        return fallback

    parsed = urlparse(cleaned)
    if parsed.scheme or parsed.netloc:
        frontend_origin = urlparse(get_request_frontend_base_url())
        if (
            parsed.scheme != frontend_origin.scheme
            or parsed.netloc != frontend_origin.netloc
        ):
            return fallback
        path = parsed.path or "/"
        query = f"?{parsed.query}" if parsed.query else ""
        return f"{path}{query}"

    if not cleaned.startswith("/"):
        return fallback

    return cleaned


def get_request_frontend_return_path(default: str = "/") -> str:
    """Best-effort current frontend page path, including query string."""
    if not has_request_context():
        return default

    candidates = [request.args.get("return_path")]

    payload = _request_payload_dict()
    if payload:
        candidates.append(payload.get("return_path"))

    candidates.append(request.headers.get("Referer"))

    for candidate in candidates:
        resolved = _extract_safe_frontend_return_path(candidate, fallback=default)
        if resolved != default or candidate:
            return resolved

    return default


def get_callback_frontend_return_url(default_path: str = "/") -> str:
    """Frontend URL for payment callbacks, including the originating page path."""
    base_url = get_callback_frontend_base_url()
    return_path = _extract_safe_frontend_return_path(
        request.args.get("return_path"),
        fallback=default_path,
    )
    if return_path.startswith("/"):
        return f"{base_url}{return_path}"
    return f"{base_url}/{return_path}"


def append_query_params(url: str, params: dict[str, str | None]) -> str:
    """Merge query params into a URL, overwriting existing keys."""
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    for key, value in params.items():
        if value is None:
            continue
        query[key] = str(value)
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))
