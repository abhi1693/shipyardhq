from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import re
from typing import Any

from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import ActivityFactDaily, ActivityItem
from services.scoring import PeriodWindow


def add_utc_days(value: datetime, days: int) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value + timedelta(days=days)


async def get_recent_activity_items(session: Session, user_id: int, limit: int = 8):
    statement = (
        select(ActivityItem)
        .where(ActivityItem.user_id == user_id)
        .order_by(ActivityItem.occurred_at.desc())
        .limit(limit)
    )
    return (await session.exec(statement)).all()


async def get_recent_activity_items_for_period(
    session: Session, user_id: int, window: PeriodWindow, limit: int = 8
):
    end_exclusive = add_utc_days(window.end, 1)
    statement = (
        select(ActivityItem)
        .where(
            ActivityItem.user_id == user_id,
            ActivityItem.occurred_at >= window.start,
            ActivityItem.occurred_at < end_exclusive,
        )
        .order_by(ActivityItem.occurred_at.desc())
        .limit(limit)
    )
    return (await session.exec(statement)).all()


async def get_top_repo_activity_for_period(
    session: Session, user_id: int, window: PeriodWindow, limit: int = 3
):
    statement = (
        select(
            ActivityFactDaily.bucket,
            func.sum(ActivityFactDaily.value).label("total"),
        )
        .where(
            ActivityFactDaily.user_id == user_id,
            ActivityFactDaily.day >= window.start.date(),
            ActivityFactDaily.day <= window.end.date(),
            ActivityFactDaily.bucket != "global",
            ActivityFactDaily.metric_key != "repos_touched",
        )
        .group_by(ActivityFactDaily.bucket)
        .order_by(func.sum(ActivityFactDaily.value).desc())
        .limit(limit)
    )
    results = (await session.exec(statement)).all()
    return [
        {
            "name": bucket,
            "total": float(total or 0),
        }
        for bucket, total in results
    ]


EVENT_LABELS = {
    "commit": "Committed changes",
    "pr_merged": "Merged pull request",
    "pr_opened": "Opened pull request",
    "review": "Submitted review",
    "issue_closed": "Closed issue",
    "issue_opened": "Opened issue",
}

METRIC_LABELS: dict[str, dict[str, object]] = {
    "commits": {"singular": "commit", "plural": "commits", "scored": True},
    "prs_merged": {"singular": "PR merged", "plural": "PRs merged", "scored": True},
    "reviews": {"singular": "review", "plural": "reviews", "scored": True},
    "issues_closed": {"singular": "issue closed", "plural": "issues closed", "scored": True},
    "prs_opened": {"singular": "PR opened", "plural": "PRs opened", "scored": False},
    "issues_opened": {"singular": "issue opened", "plural": "issues opened", "scored": False},
}


@dataclass(frozen=True)
class ActivityItemDisplay:
    label: str
    detail: str | None
    repo: str | None
    summary: str
    scored: bool


def humanize_event_type(value: str) -> str:
    if value in EVENT_LABELS:
        return EVENT_LABELS[value]
    without_event = re.sub(r"Event$", "", value)
    spaced = without_event.replace("_", " ")
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", spaced)
    return spaced[:1].upper() + spaced[1:] if spaced else value


def extract_metrics(metadata: dict[str, Any] | None) -> list[dict[str, float]]:
    if not metadata:
        return []
    raw = metadata.get("metrics")
    if not isinstance(raw, list):
        return []
    metrics: list[dict[str, float]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        key = item.get("key")
        value = item.get("value")
        if not isinstance(key, str) or not isinstance(value, (int, float)):
            continue
        metrics.append({"key": key, "value": float(value)})
    return metrics


def format_metric_value(value: float) -> str:
    if value.is_integer():
        return str(int(value))
    return str(value)


def format_metric_summary(metrics: list[dict[str, float]]) -> str | None:
    parts: list[str] = []
    for metric in metrics:
        label = METRIC_LABELS.get(metric["key"])
        if not label:
            continue
        noun = label["singular"] if metric["value"] == 1 else label["plural"]
        parts.append(f"{format_metric_value(metric['value'])} {noun}")
    return ", ".join(parts) if parts else None


def coerce_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def build_activity_item_display(item: ActivityItem) -> ActivityItemDisplay:
    metadata = item.metadata_ if isinstance(item.metadata_, dict) else None
    metrics = extract_metrics(metadata)
    summary = format_metric_summary(metrics) or "Activity logged"
    scored = any(METRIC_LABELS.get(metric["key"], {}).get("scored") for metric in metrics)
    title = item.title
    if not title and metadata:
        title = metadata.get("title")
    title = title.strip() if isinstance(title, str) and title.strip() else None
    number = item.number if item.number is not None else coerce_int(metadata.get("number") if metadata else None)
    label = humanize_event_type(item.type)

    detail_parts: list[str] = []
    if isinstance(number, int):
        detail_parts.append(f"#{number}")
    if title:
        detail_parts.append(title)
    if not detail_parts and item.repo_full_name:
        detail_parts.append(item.repo_full_name)

    detail = " - ".join(detail_parts) if detail_parts else None
    repo_label = (
        item.repo_full_name
        if item.repo_full_name and item.repo_full_name not in detail_parts
        else None
    )

    return ActivityItemDisplay(
        label=label,
        detail=detail,
        repo=repo_label,
        summary=summary,
        scored=bool(scored),
    )
