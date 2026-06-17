"""
Armed Response Service
======================
File: backend/services/armed_response_service.py

 When we decide on a provider, fill in the
three TODO blocks. Nothing else in the codebase changes.

Current behaviour with no provider configured:
  - trigger_dispatch() returns status "pending_provider"
  - DB logging, email notifications and admin panel all work fully
"""
import logging
from flask import current_app

logger = logging.getLogger(__name__)


def _get_token() -> str | None:
    """
    Obtain a bearer token from the armed response provider.

    TODO — Aura example:
        response = requests.post(
            f"{current_app.config['ARMED_RESPONSE_BASE_URL']}/oauth/token",
            json={
                "clientId": current_app.config["ARMED_RESPONSE_CLIENT_ID"],
                "clientSecret": current_app.config["ARMED_RESPONSE_SECRET_KEY"],
            },
            timeout=10,
        )
        return response.json().get("accessToken")

    TODO —  For example,MyLifeline:
        MyLifeline pushes TO you (inbound webhook). No outbound auth token needed.
        Contact them to confirm whether an outbound trigger API exists.
    """
    return None


def register_user(user) -> str | None:
    """
    Register a user with the armed response provider at account creation time.
    Store the provider-side ID on user.aura_id (already on the User model).

    TODO — Aura example:
        import requests
        token = _get_token()
        response = requests.post(
            f"{current_app.config['ARMED_RESPONSE_BASE_URL']}/customer-signup/sessions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": user.email,
                "returnUrl": "https://mzansiserve.co.za",
                "customerReferenceId": str(user.id),
            },
            timeout=10,
        )
        customer_id = response.json().get("customerId")
        user.aura_id = customer_id
        user.aura_status = "active"
        db.session.commit()
        return customer_id

    Returns the provider-side user ID, or None if not implemented.
    """
    logger.info("[armed_response] register_user: no provider configured, skipping.")
    return None


def trigger_dispatch(user, latitude, longitude, booking_id=None) -> dict:
    """
    Trigger an armed response callout for a user in distress.

    TODO — Aura example:
        import requests
        token = _get_token()
        response = requests.post(
            f"{current_app.config['ARMED_RESPONSE_BASE_URL']}/v2/customers/{user.aura_id}/callouts",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "accuracy": 10,
                },
                "calloutClassificationId": 1,   # 1=REAL, 2=TEST
                "responseTypeId": 1,             # 1=Security, 2=Medical
                "internalTest": False,
            },
            timeout=10,
        )
        data = response.json()
        return {
            "ref": data["callout"]["id"],
            "status": data["callout"]["status"],
        }

    TODO — MyLifeline:
        MyLifeline is inbound-only: they push panic events TO your webhook
        from physical devices. No software-only outbound trigger exists yet.
        Contact them directly to confirm if a REST trigger API is available.

    Returns dict: { "ref": str|None, "status": str }
    """
    logger.warning(
        "[armed_response] No provider configured. "
        "Panic logged to DB and admin notified by email only."
    )
    return {
        "ref": None,
        "status": "pending_provider",
    }


def is_configured() -> bool:
    """Returns True only when a real provider is wired up and tested."""
    # TODO: flip to True once a provider is implemented
    return False