from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from models import PaymentConnector


def _extract_rate(value: Any) -> float | None:
    if not isinstance(value, dict):
        return None
    rate = value.get("rateToUsd")
    if isinstance(rate, (int, float)) and rate > 0:
        return float(rate)
    return None


def _convert_to_usd_cents(
    amount_cents: int,
    currency_code: str | None,
    rates: dict[str, float],
) -> tuple[int, float | None]:
    code = (currency_code or "USD").upper()
    if code == "USD":
        return amount_cents, 1.0
    rate = rates.get(code)
    if rate and rate > 0:
        return int(round(amount_cents / rate)), rate
    return amount_cents, None


def _label_for_date(value: datetime) -> str:
    month = value.strftime("%b")
    return f"{month} {value.day}, {value.year}"


def build_revenue_summary(connector: PaymentConnector) -> dict[str, Any] | None:
    history = connector.revenue_history or []
    if not history:
        return None

    rates: dict[str, float] = {}
    for snapshot in history:
        rate = _extract_rate(snapshot.data)
        if rate:
            rates[(snapshot.currency_code or "USD").upper()] = rate

    entries: list[dict[str, Any]] = []
    for snapshot in history:
        currency = (snapshot.currency_code or "USD").upper()
        period_cents = int(snapshot.period_revenue_cents or 0)
        all_time_cents = int(snapshot.all_time_revenue_cents or 0)
        if currency != "USD" and rates.get(currency):
            all_time_cents, _ = _convert_to_usd_cents(all_time_cents, currency, rates)
            period_cents, _ = _convert_to_usd_cents(period_cents, currency, rates)
            currency = "USD"
        entries.append(
            {
                "period_start": snapshot.period_start,
                "currency_code": currency,
                "period_cents": period_cents,
                "all_time_cents": all_time_cents,
            }
        )

    entries.sort(key=lambda row: row["period_start"])
    if not entries:
        return None

    if all(entry["currency_code"] == "USD" for entry in entries):
        display_currency = "USD"
    else:
        display_currency = entries[-1]["currency_code"]

    filtered = [entry for entry in entries if entry["currency_code"] == display_currency]
    if not filtered:
        return None

    buckets: dict[tuple[int, int, int], dict[str, Any]] = {}
    for entry in filtered:
        dt = entry["period_start"]
        if isinstance(dt, datetime):
            date_key = (dt.year, dt.month, dt.day)
            existing = buckets.get(date_key)
            if existing is None:
                buckets[date_key] = {
                    "period_start": datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc),
                    "period_cents": entry["period_cents"],
                }
            else:
                existing["period_cents"] += entry["period_cents"]

    ordered = [buckets[key] for key in sorted(buckets.keys())]
    points: list[dict[str, Any]] = []
    running_total = 0
    for bucket in ordered:
        running_total += int(bucket["period_cents"] or 0)
        period_start: datetime = bucket["period_start"]
        points.append(
            {
                "periodStart": period_start.isoformat(),
                "label": _label_for_date(period_start),
                "allTimeRevenueCents": running_total,
                "periodRevenueCents": int(bucket["period_cents"] or 0),
            }
        )

    latest_all_time = running_total
    last_synced_at = (
        connector.last_synced_at.isoformat()
        if connector.last_synced_at
        else None
    )
    return {
        "currencyCode": display_currency,
        "lastSyncedAt": last_synced_at,
        "status": connector.status.value if connector.status else None,
        "provider": connector.provider.value if connector.provider else None,
        "latestAllTimeRevenueCents": latest_all_time,
        "points": points,
    }
