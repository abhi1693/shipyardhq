from __future__ import annotations

import os
from typing import Any

import httpx

from services.cache import cached_json
from services.logger import AppLogger

logger = AppLogger.get_logger(__name__)

USD_RATES_URL = os.getenv("USD_RATES_URL", "https://open.er-api.com/v6/latest/USD")
USD_RATES_CACHE_TTL_SECONDS = 60 * 60 * 24


def _normalize_rates(payload: Any) -> dict[str, float]:
    if not isinstance(payload, dict):
        return {"USD": 1.0}
    rates = payload.get("rates")
    if not isinstance(rates, dict):
        return {"USD": 1.0}
    normalized: dict[str, float] = {}
    for code, value in rates.items():
        if not isinstance(code, str):
            continue
        try:
            rate_value = float(value)
        except (TypeError, ValueError):
            continue
        if rate_value <= 0:
            continue
        normalized[code.upper()] = rate_value
    if "USD" not in normalized:
        normalized["USD"] = 1.0
    return normalized


async def _fetch_usd_rates() -> dict[str, float]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(USD_RATES_URL)
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        logger.warning("USD rates fetch failed", extra={"error": str(exc)})
        return {"USD": 1.0}

    return _normalize_rates(payload)


async def get_usd_conversion_rates() -> dict[str, float]:
    async def build_payload() -> dict[str, float]:
        return await _fetch_usd_rates()

    payload = await cached_json(
        "internal:usd-rates",
        ttl_seconds=USD_RATES_CACHE_TTL_SECONDS,
        path="/internal/usd-rates",
        builder=build_payload,
    )
    return _normalize_rates(payload)


def convert_to_usd_cents(
    amount_cents: int,
    currency_code: str | None,
    rates: dict[str, float],
) -> tuple[int, float | None]:
    code = (currency_code or "USD").upper()
    if code == "USD":
        return amount_cents, 1.0
    rate = rates.get(code)
    if rate and rate > 0:
        usd_cents = int(round(amount_cents / rate))
        return usd_cents, rate
    return amount_cents, None
