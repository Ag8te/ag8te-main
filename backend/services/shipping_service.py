"""
Shipping service integration for Shiplogic / The Courier Guy.
"""
from __future__ import annotations

import logging
import math
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import requests
from flask import current_app

from backend.extensions import db
from backend.models import AppSetting
from backend.models.shop import Order
from backend.utils.logging import log_external_api

logger = logging.getLogger(__name__)


class ShiplogicService:
    """Quote and shipment orchestration for shop orders."""

    SETTING_KEY = "shipping_shiplogic"

    @staticmethod
    def get_settings() -> Dict[str, Any]:
        setting = AppSetting.query.get(ShiplogicService.SETTING_KEY)
        stored = setting.value if setting and isinstance(setting.value, dict) else {}

        defaults = {
            "enabled": bool(current_app.config.get("SHIPLOGIC_ENABLED", False)),
            "api_key": current_app.config.get("SHIPLOGIC_API_KEY", "") or "",
            "api_url": current_app.config.get("SHIPLOGIC_API_URL", "https://api.shiplogic.com"),
            "courier_name": "The Courier Guy",
            "collection_company": current_app.config.get("SHIPLOGIC_COLLECTION_COMPANY", "") or "",
            "collection_name": current_app.config.get("SHIPLOGIC_COLLECTION_NAME", "") or "",
            "collection_phone": current_app.config.get("SHIPLOGIC_COLLECTION_PHONE", "") or "",
            "collection_email": current_app.config.get("SHIPLOGIC_COLLECTION_EMAIL", "") or "",
            "collection_street_address": current_app.config.get("SHIPLOGIC_COLLECTION_STREET_ADDRESS", "") or "",
            "collection_local_area": current_app.config.get("SHIPLOGIC_COLLECTION_LOCAL_AREA", "") or "",
            "collection_city": current_app.config.get("SHIPLOGIC_COLLECTION_CITY", "") or "",
            "collection_zone": current_app.config.get("SHIPLOGIC_COLLECTION_ZONE", "") or "",
            "collection_code": current_app.config.get("SHIPLOGIC_COLLECTION_CODE", "") or "",
            "collection_country": current_app.config.get("SHIPLOGIC_COLLECTION_COUNTRY", "ZA") or "ZA",
            "default_parcel_description": current_app.config.get("SHIPLOGIC_DEFAULT_PARCEL_DESCRIPTION", "General goods") or "General goods",
            "default_weight_kg": float(current_app.config.get("SHIPLOGIC_DEFAULT_WEIGHT_KG", 1.0) or 1.0),
            "default_length_cm": float(current_app.config.get("SHIPLOGIC_DEFAULT_LENGTH_CM", 30.0) or 30.0),
            "default_width_cm": float(current_app.config.get("SHIPLOGIC_DEFAULT_WIDTH_CM", 25.0) or 25.0),
            "default_height_cm": float(current_app.config.get("SHIPLOGIC_DEFAULT_HEIGHT_CM", 20.0) or 20.0),
            "max_weight_per_parcel_kg": float(current_app.config.get("SHIPLOGIC_MAX_WEIGHT_PER_PARCEL_KG", 25.0) or 25.0),
            "shipping_markup_type": current_app.config.get("SHIPLOGIC_SHIPPING_MARKUP_TYPE", "flat") or "flat",
            "shipping_markup_value": float(current_app.config.get("SHIPLOGIC_SHIPPING_MARKUP_VALUE", 0.0) or 0.0),
            "automatic_shipment_creation": bool(current_app.config.get("SHIPLOGIC_AUTOMATIC_SHIPMENT_CREATION", True)),
        }

        defaults.update(stored)
        defaults["api_url"] = (defaults.get("api_url") or "https://api.shiplogic.com").rstrip("/")
        defaults["shipping_markup_value"] = float(defaults.get("shipping_markup_value") or 0.0)
        return defaults

    @staticmethod
    def is_enabled(settings: Optional[Dict[str, Any]] = None) -> bool:
        settings = settings or ShiplogicService.get_settings()
        return bool(settings.get("enabled") and settings.get("api_key"))

    @staticmethod
    def _required_collection_fields(settings: Dict[str, Any]) -> List[str]:
        required = [
            "api_key",
            "collection_name",
            "collection_phone",
            "collection_street_address",
            "collection_local_area",
            "collection_city",
            "collection_zone",
            "collection_code",
        ]
        return [field for field in required if not settings.get(field)]

    @staticmethod
    def validate_configuration(settings: Optional[Dict[str, Any]] = None) -> Tuple[bool, List[str]]:
        settings = settings or ShiplogicService.get_settings()
        if not settings.get("enabled"):
            return False, ["enabled"]
        missing = ShiplogicService._required_collection_fields(settings)
        return len(missing) == 0, missing

    @staticmethod
    def get_readiness() -> Dict[str, Any]:
        settings = ShiplogicService.get_settings()
        ready, missing = ShiplogicService.validate_configuration(settings)
        return {
            "enabled": bool(settings.get("enabled")),
            "ready": ready,
            "missing_fields": missing,
        }

    @staticmethod
    def _headers(settings: Dict[str, Any], accept: str = "application/json") -> Dict[str, str]:
        api_key = settings.get("api_key", "")
        return {
            "Authorization": f"Bearer {api_key}",
            "X-Api-Key": api_key,
            "Accept": accept,
            "Content-Type": "application/json",
        }

    @staticmethod
    def _request(
        method: str,
        endpoint: str,
        *,
        settings: Dict[str, Any],
        payload: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        accept: str = "application/json",
        timeout: int = 30,
    ) -> Any:
        url = f"{settings['api_url']}{endpoint}"
        headers = ShiplogicService._headers(settings, accept=accept)
        response = requests.request(
            method=method,
            url=url,
            json=payload,
            params=params,
            headers=headers,
            timeout=timeout,
        )

        body: Any
        if accept == "application/json":
            try:
                body = response.json()
            except ValueError:
                body = {"text": response.text}
        else:
            body = {"content_type": response.headers.get("Content-Type"), "size": len(response.content)}

        log_external_api(
            provider="shiplogic",
            endpoint=endpoint,
            method=method,
            request_payload=payload or params,
            response_payload=body,
            status_code=response.status_code,
            error_message=None if response.ok else str(body),
        )

        if not response.ok:
            message = "Shiplogic request failed"
            if isinstance(body, dict):
                message = (
                    body.get("message")
                    or body.get("error")
                    or body.get("detail")
                    or body.get("text")
                    or message
                )
            raise ValueError(f"{message} (HTTP {response.status_code})")

        return response if accept != "application/json" else body

    @staticmethod
    def _collection_address(settings: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "company": settings.get("collection_company") or None,
            "name": settings.get("collection_name"),
            "phone": settings.get("collection_phone"),
            "email": settings.get("collection_email") or None,
            "street_address": settings.get("collection_street_address"),
            "local_area": settings.get("collection_local_area"),
            "city": settings.get("collection_city"),
            "zone": settings.get("collection_zone"),
            "code": settings.get("collection_code"),
            "country": settings.get("collection_country") or "ZA",
        }

    @staticmethod
    def _delivery_address(shipping: Dict[str, Any], recipient: Dict[str, Any]) -> Dict[str, Any]:
        first_name = (recipient.get("first_name") or "").strip()
        last_name = (recipient.get("last_name") or "").strip()
        full_name = (recipient.get("name") or f"{first_name} {last_name}").strip()

        return {
            "company": shipping.get("company") or None,
            "name": full_name or recipient.get("email") or "Customer",
            "phone": recipient.get("phone"),
            "email": recipient.get("email"),
            "street_address": shipping.get("street_address"),
            "local_area": shipping.get("suburb") or shipping.get("local_area") or shipping.get("city"),
            "city": shipping.get("city"),
            "zone": shipping.get("province") or shipping.get("zone"),
            "code": shipping.get("postal_code") or shipping.get("code"),
            "country": shipping.get("country") or "ZA",
            "unit_number": shipping.get("unit_number") or None,
            "building_name": shipping.get("building_name") or None,
            "instructions": shipping.get("delivery_instructions") or None,
        }

    @staticmethod
    def _build_parcels(items: List[Dict[str, Any]], settings: Dict[str, Any]) -> List[Dict[str, Any]]:
        default_weight = float(settings.get("default_weight_kg") or 1.0)
        max_weight = max(float(settings.get("max_weight_per_parcel_kg") or 25.0), 0.1)
        total_units = sum(max(int(item.get("quantity") or 0), 0) for item in items) or 1
        total_weight = max(default_weight * total_units, default_weight)
        parcel_count = max(1, math.ceil(total_weight / max_weight))
        product_names = [item.get("product_name") for item in items if item.get("product_name")]
        description = settings.get("default_parcel_description") or "General goods"
        if product_names:
            description = ", ".join(product_names[:2])
            if len(product_names) > 2:
                description += " and more"

        remaining_weight = total_weight
        parcels: List[Dict[str, Any]] = []
        for _ in range(parcel_count):
            parcel_weight = round(min(remaining_weight, max_weight), 2)
            parcels.append(
                {
                    "submitted_length_cm": float(settings.get("default_length_cm") or 30.0),
                    "submitted_width_cm": float(settings.get("default_width_cm") or 25.0),
                    "submitted_height_cm": float(settings.get("default_height_cm") or 20.0),
                    "submitted_weight_kg": parcel_weight,
                    "description": description,
                    "quantity": 1,
                }
            )
            remaining_weight = max(0.0, remaining_weight - parcel_weight)

        return parcels

    @staticmethod
    def _build_quote_payload(
        items: List[Dict[str, Any]],
        shipping: Dict[str, Any],
        recipient: Dict[str, Any],
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            "collection_address": ShiplogicService._collection_address(settings),
            "delivery_address": ShiplogicService._delivery_address(shipping, recipient),
            "parcels": ShiplogicService._build_parcels(items, settings),
        }

    @staticmethod
    def _quote_amount(raw_rate: Dict[str, Any]) -> float:
        candidate_keys = [
            "total",
            "amount",
            "price",
            "quoted_price",
            "selling_price",
            "selling_price_incl_vat",
            "total_incl_vat",
            "rate",
        ]
        for key in candidate_keys:
            value = raw_rate.get(key)
            if value is not None:
                try:
                    return float(value)
                except (TypeError, ValueError):
                    continue
        return 0.0

    @staticmethod
    def _apply_markup(amount: float, settings: Dict[str, Any]) -> Tuple[float, float]:
        markup_value = float(settings.get("shipping_markup_value") or 0.0)
        markup_type = (settings.get("shipping_markup_type") or "flat").strip().lower()

        if markup_type == "percentage":
            markup_amount = amount * (markup_value / 100.0)
        else:
            markup_amount = markup_value

        total = round(amount + markup_amount, 2)
        return total, round(markup_amount, 2)

    @staticmethod
    def _normalize_rate(raw_rate: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        base_amount = round(ShiplogicService._quote_amount(raw_rate), 2)
        total_amount, markup_amount = ShiplogicService._apply_markup(base_amount, settings)
        service_code = (
            raw_rate.get("service_level_code")
            or raw_rate.get("service_code")
            or raw_rate.get("rate_id")
            or raw_rate.get("id")
        )
        service_name = (
            raw_rate.get("service_level_name")
            or raw_rate.get("service_name")
            or raw_rate.get("name")
            or raw_rate.get("description")
            or "Courier delivery"
        )
        eta_days = raw_rate.get("estimated_days") or raw_rate.get("eta_days") or raw_rate.get("delivery_days")
        return {
            "quote_id": str(raw_rate.get("rate_id") or raw_rate.get("id") or service_code or service_name),
            "carrier": raw_rate.get("carrier") or raw_rate.get("courier_name") or settings.get("courier_name") or "The Courier Guy",
            "service_level_code": service_code,
            "service_name": service_name,
            "amount": total_amount,
            "base_amount": base_amount,
            "markup_amount": markup_amount,
            "currency": raw_rate.get("currency") or "ZAR",
            "estimated_days": eta_days,
            "estimated_delivery_date": raw_rate.get("estimated_delivery_date"),
            "raw": raw_rate,
        }

    @staticmethod
    def _extract_rate_items(payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if not isinstance(payload, dict):
            return []

        candidate_containers = [
            payload.get("rates"),
            payload.get("results"),
            payload.get("data"),
            payload.get("quotes"),
            payload.get("response"),
        ]
        for container in candidate_containers:
            if isinstance(container, list):
                return [item for item in container if isinstance(item, dict)]
        return [payload] if payload else []

    @staticmethod
    def get_rates_for_order(
        items: List[Dict[str, Any]],
        shipping: Dict[str, Any],
        recipient: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        settings = ShiplogicService.get_settings()
        ready, missing = ShiplogicService.validate_configuration(settings)
        if not ready:
            raise ValueError(f"Shipping service is not configured: missing {', '.join(missing)}")

        payload = ShiplogicService._build_quote_payload(items, shipping, recipient, settings)
        raw = ShiplogicService._request("POST", "/rates", settings=settings, payload=payload)
        normalized = [ShiplogicService._normalize_rate(item, settings) for item in ShiplogicService._extract_rate_items(raw)]
        normalized.sort(key=lambda item: item.get("amount") or 0.0)
        return normalized

    @staticmethod
    def resolve_selected_rate(selected_quote: Optional[Dict[str, Any]], rates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not rates:
            return None
        if not selected_quote:
            return rates[0]

        selected_id = str(selected_quote.get("quote_id") or "")
        selected_code = str(selected_quote.get("service_level_code") or "")
        selected_name = str(selected_quote.get("service_name") or "").strip().lower()

        for rate in rates:
            if selected_id and str(rate.get("quote_id")) == selected_id:
                return rate
            if selected_code and str(rate.get("service_level_code") or "") == selected_code:
                return rate
            if selected_name and str(rate.get("service_name") or "").strip().lower() == selected_name:
                return rate
        return None

    @staticmethod
    def _normalize_shipment(raw: Dict[str, Any], quote: Dict[str, Any], settings: Dict[str, Any]) -> Dict[str, Any]:
        shipment_id = raw.get("id") or raw.get("shipment_id") or raw.get("waybill_id")
        tracking_reference = (
            raw.get("tracking_reference")
            or raw.get("tracking_number")
            or raw.get("tracking_reference_number")
            or raw.get("waybill_number")
        )
        service_name = (
            raw.get("service_level_name")
            or raw.get("service_name")
            or quote.get("service_name")
        )
        shipment_status = raw.get("status") or raw.get("shipment_status") or raw.get("state") or "created"
        return {
            "id": shipment_id,
            "tracking_reference": tracking_reference,
            "status": shipment_status,
            "carrier": settings.get("courier_name") or "The Courier Guy",
            "service_level_code": raw.get("service_level_code") or quote.get("service_level_code"),
            "service_name": service_name,
            "estimated_delivery_date": raw.get("estimated_delivery_date") or quote.get("estimated_delivery_date"),
            "estimated_days": raw.get("estimated_days") or quote.get("estimated_days"),
            "raw": raw,
        }

    @staticmethod
    def create_shipment_for_order(order: Order) -> Tuple[bool, Optional[str]]:
        settings = ShiplogicService.get_settings()
        if not ShiplogicService.is_enabled(settings):
            return False, "Shipping service is disabled"
        if not settings.get("automatic_shipment_creation", True):
            return False, "Automatic shipment creation is disabled"

        shipping = dict(order.shipping or {})
        recipient = dict(shipping.get("recipient") or {})
        address = dict(shipping.get("address") or {})
        quote = dict(shipping.get("quote") or {})

        if not recipient or not address:
            return False, "Missing shipping recipient or address details"

        payload = ShiplogicService._build_quote_payload(order.items or [], address, recipient, settings)
        payload.update(
            {
                "tracking_reference": order.id,
                "reference": order.id,
                "declared_value": float(order.total or 0.0),
                "special_instructions": address.get("delivery_instructions") or None,
            }
        )

        if quote.get("service_level_code"):
            payload["service_level_code"] = quote.get("service_level_code")
        if quote.get("quote_id"):
            payload["rate_id"] = quote.get("quote_id")

        raw = ShiplogicService._request("POST", "/shipments", settings=settings, payload=payload)
        shipment = ShiplogicService._normalize_shipment(raw if isinstance(raw, dict) else {}, quote, settings)
        shipping["shipment"] = shipment
        shipping["shipment_status"] = shipment.get("status")
        shipping["tracking_reference"] = shipment.get("tracking_reference")
        shipping["shipment_error"] = None
        order.shipping = shipping
        db.session.commit()
        return True, None

    @staticmethod
    def mark_shipment_error(order: Order, message: str) -> None:
        shipping = dict(order.shipping or {})
        shipping["shipment_error"] = message
        shipping["shipment_status"] = shipping.get("shipment_status") or "creation_failed"
        order.shipping = shipping
        db.session.commit()

    @staticmethod
    def get_shipment_label_pdf(order: Order) -> BytesIO:
        settings = ShiplogicService.get_settings()
        shipment = (order.shipping or {}).get("shipment") or {}
        shipment_id = shipment.get("id")
        if not shipment_id:
            raise ValueError("Order does not have a created shipment yet")

        response = ShiplogicService._request(
            "GET",
            "/shipments/label",
            settings=settings,
            params={"id": shipment_id},
            accept="application/pdf",
        )
        return BytesIO(response.content)

    @staticmethod
    def cancel_shipment(order: Order) -> Tuple[bool, Optional[str]]:
        settings = ShiplogicService.get_settings()
        shipment = (order.shipping or {}).get("shipment") or {}
        shipment_id = shipment.get("id")
        if not shipment_id:
            return False, "Order does not have a created shipment yet"

        ShiplogicService._request(
            "POST",
            "/shipments/cancel",
            settings=settings,
            payload={"id": shipment_id},
        )
        shipping = dict(order.shipping or {})
        shipping["shipment_status"] = "cancelled"
        shipping["shipment_error"] = None
        if shipping.get("shipment"):
            shipping["shipment"]["status"] = "cancelled"
        order.shipping = shipping
        db.session.commit()
        return True, None
