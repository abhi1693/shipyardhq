from __future__ import annotations

import math
from datetime import date, datetime, timezone

EM_DASH = "\u2014"

MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

MONTH_NAMES_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


def ensure_utc_datetime(value: date | datetime) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)


def format_period_value(value: date | datetime) -> str:
    resolved = ensure_utc_datetime(value).date()
    return f"{resolved.year:04d}-{resolved.month:02d}"


def format_score(value: float | int | None, decimals: int = 1) -> str:
    if value is None:
        return EM_DASH
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return EM_DASH
    if math.isnan(numeric):
        return EM_DASH
    return f"{numeric:.{decimals}f}"


def format_percent(value: float | int | None, decimals: int = 1) -> str:
    if value is None:
        return EM_DASH
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return EM_DASH
    if math.isnan(numeric):
        return EM_DASH
    return f"{numeric:.{decimals}f}%"


def format_count(value: float | int | None) -> str:
    if value is None:
        return "0"
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return "0"
    if math.isnan(numeric):
        return "0"
    if numeric.is_integer():
        return str(int(numeric))
    return format(numeric, "g")


def format_momentum_label(value: float | None) -> str:
    if value is None:
        return EM_DASH
    if isinstance(value, float) and math.isnan(value):
        return EM_DASH
    rounded = int(round(value))
    sign = "+" if rounded > 0 else ""
    return f"{sign}{rounded}%"


def format_month_year(value: date | datetime) -> str:
    resolved = ensure_utc_datetime(value)
    return f"{MONTH_NAMES[resolved.month - 1]} {resolved.year}"


def format_month_year_short(value: date | datetime) -> str:
    resolved = ensure_utc_datetime(value)
    return f"{MONTH_NAMES_SHORT[resolved.month - 1]} {resolved.year}"


def format_month_year_short_two_digit(value: date | datetime) -> str:
    resolved = ensure_utc_datetime(value)
    return f"{MONTH_NAMES_SHORT[resolved.month - 1]} {resolved.year % 100:02d}"


def format_date_label(value: datetime) -> str:
    resolved = ensure_utc_datetime(value)
    return f"{MONTH_NAMES_SHORT[resolved.month - 1]} {resolved.day}, {resolved.year}"


def format_datetime_label(value: datetime) -> str:
    resolved = ensure_utc_datetime(value)
    hour = resolved.hour
    hour_12 = hour % 12 or 12
    minute = resolved.minute
    meridiem = "AM" if hour < 12 else "PM"
    return (
        f"{MONTH_NAMES_SHORT[resolved.month - 1]} {resolved.day}, {resolved.year}, "
        f"{hour_12:02d}:{minute:02d} {meridiem}"
    )


def build_avatar_label(display_name: str | None, handle: str | None) -> str:
    source = (display_name or handle or "").strip()
    if not source:
        return "?"
    return source[0].upper()
