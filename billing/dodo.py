from __future__ import annotations

import logging
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from dodopayments import DodoPayments, DodoPaymentsError

from .models import DEFAULT_CURRENCY_CODE

logger = logging.getLogger(__name__)

DODO_ENVIRONMENTS = {"live_mode", "test_mode"}


class DodoConfigurationError(Exception):
    pass


class DodoSyncError(Exception):
    pass


def dodo_configured():
    return bool(settings.DODO_API_KEY)


def dodo_client():
    if not settings.DODO_API_KEY:
        raise DodoConfigurationError("Dodo is not configured.")
    if settings.DODO_ENV not in DODO_ENVIRONMENTS:
        raise DodoConfigurationError("Dodo environment must be live_mode or test_mode.")

    return DodoPayments(
        bearer_token=settings.DODO_API_KEY,
        webhook_key=settings.DODO_WEBHOOK_SECRET or None,
        environment=settings.DODO_ENV,
        timeout=20.0,
    )


def sync_plan_to_dodo(plan):
    if plan.price_cents == 0:
        return plan

    payload = {
        "name": plan.name,
        "description": plan.description or "",
        "tax_category": "saas",
        "price": _price_payload(plan),
        "metadata": {
            "plan_id": str(plan.pk),
            "plan_slug": plan.slug,
        },
    }

    try:
        if plan.external_id:
            dodo_client().products.update(plan.external_id, **payload)
            return plan

        dodo_product = dodo_client().products.create(**payload)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        logger.exception("Dodo product sync failed for plan %s.", plan.pk)
        raise DodoSyncError(_sync_error_message(exc, "synced")) from exc

    plan.external_id = dodo_product.product_id
    plan.save(update_fields=["external_id"])
    return plan


def archive_plan_in_dodo(plan):
    if not plan.external_id:
        return

    try:
        dodo_client().products.archive(plan.external_id)
    except (DodoConfigurationError, DodoPaymentsError) as exc:
        logger.exception("Dodo product archive failed for plan %s.", plan.pk)
        raise DodoSyncError(_sync_error_message(exc, "archived")) from exc


def _price_payload(plan):
    payload = {
        "currency": DEFAULT_CURRENCY_CODE,
        "discount": _discount_percent(plan.discount_percent),
        "price": plan.price_cents,
        "purchasing_power_parity": True,
        "tax_inclusive": False,
        "type": plan.type,
    }

    if plan.is_recurring:
        payload.update(
            {
                "payment_frequency_count": plan.payment_frequency_count or 1,
                "payment_frequency_interval": _dodo_interval(plan.payment_frequency_interval),
                "subscription_period_count": plan.subscription_period_count or plan.payment_frequency_count or 1,
                "subscription_period_interval": _dodo_interval(
                    plan.subscription_period_interval or plan.payment_frequency_interval
                ),
            }
        )

    return payload


def _discount_percent(value):
    if value is None:
        return 0
    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _sync_error_message(exc, action):
    detail = _error_detail(exc)
    if detail:
        return f"This plan was saved, but the Dodo product could not be {action}: {detail}"
    return f"This plan was saved, but the Dodo product could not be {action}."


def _error_detail(exc):
    body_detail = _body_detail(getattr(exc, "body", None))
    if body_detail:
        return body_detail

    message = getattr(exc, "message", "") or str(exc)
    if not message:
        return ""

    status_code = getattr(exc, "status_code", None)
    if status_code:
        return f"{message} ({status_code})"
    return message


def _body_detail(body):
    if not body:
        return ""

    if isinstance(body, str):
        return body

    if isinstance(body, dict):
        for key in ("message", "error", "detail", "reason"):
            value = body.get(key)
            if isinstance(value, str) and value:
                return value
            if isinstance(value, dict):
                nested = _body_detail(value)
                if nested:
                    return nested

        errors = body.get("errors")
        if isinstance(errors, list):
            messages = [_body_detail(error) for error in errors]
            return "; ".join(message for message in messages if message)

    return ""


def _dodo_interval(value):
    match (value or "month").lower():
        case "day":
            return "Day"
        case "week":
            return "Week"
        case "year":
            return "Year"
        case _:
            return "Month"
