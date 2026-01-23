from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy import delete, func, or_
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import (
    ActivityFactDaily,
    LeaderboardEntryRecord,
    ProviderInstallation,
    ProviderInstallationUser,
    Repository,
    ScoreSnapshot,
    User,
    UserSettings,
)
from services.cache import delete_by_prefix
from services.scoring import (
    SCORE_ACTIVITY_METRIC_KEYS,
    SCORE_METRIC_KEYS,
    compute_raw_totals,
    normalize_score,
    to_utc_date,
)

LeaderboardPeriod = Literal["daily", "weekly", "monthly"]

LEADERBOARD_PERIOD_LABELS: dict[LeaderboardPeriod, str] = {
    "daily": "Daily",
    "weekly": "Weekly",
    "monthly": "Monthly",
}
LEADERBOARD_LIST_CACHE_PREFIX = "leaderboards:list"
LEADERBOARD_SCOPE_CACHE_PREFIX = "leaderboards:scope"


@dataclass(frozen=True)
class LeaderboardWindow:
    period: LeaderboardPeriod
    label: str
    start: datetime
    end: datetime
    days: int


def resolve_leaderboard_period(value: str | None) -> LeaderboardPeriod:
    if not value:
        return "monthly"
    normalized = value.strip().lower()
    if normalized in {"daily", "weekly", "monthly"}:
        return normalized  # type: ignore[return-value]
    return "monthly"


def get_leaderboard_window(
    period: LeaderboardPeriod, now: datetime | None = None
) -> LeaderboardWindow:
    now = now or datetime.now(timezone.utc)
    if period == "daily":
        start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        end = start
        return LeaderboardWindow(
            period=period,
            label=LEADERBOARD_PERIOD_LABELS[period],
            start=start,
            end=end,
            days=1,
        )
    if period == "weekly":
        start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        start = start - timedelta(days=start.weekday())
        end = start + timedelta(days=6)
        return LeaderboardWindow(
            period=period,
            label=LEADERBOARD_PERIOD_LABELS[period],
            start=start,
            end=end,
            days=7,
        )
    start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    next_month = datetime(
        now.year + (1 if now.month == 12 else 0),
        1 if now.month == 12 else now.month + 1,
        1,
        tzinfo=timezone.utc,
    )
    end = next_month - timedelta(days=1)
    days = end.day
    return LeaderboardWindow(
        period=period,
        label=LEADERBOARD_PERIOD_LABELS[period],
        start=start,
        end=end,
        days=days,
    )


def build_leaderboard_scope(
    scope: str | None,
    *,
    country: str | None = None,
    language: str | None = None,
) -> tuple[str, dict[str, Any] | None]:
    if scope:
        normalized = scope.strip().lower()
        return normalized if normalized else "global", None
    metadata: dict[str, Any] = {}
    parts: list[str] = []
    if country:
        country_value = country.strip().lower()
        if country_value:
            parts.append(f"country:{country_value}")
            metadata["country"] = country_value
    if language:
        language_value = language.strip().lower()
        if language_value:
            parts.append(f"language:{language_value}")
            metadata["language"] = language_value
    if not parts:
        return "global", None
    return "|".join(parts), metadata


def _normalize_scope_value(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized if normalized else None


def _extract_scope_value(
    scope: str | None,
    scope_metadata: dict[str, Any] | None,
    key: str,
) -> str | None:
    if scope_metadata:
        raw_value = scope_metadata.get(key)
        if isinstance(raw_value, str):
            return _normalize_scope_value(raw_value)
    if scope:
        prefix = f"{key}:"
        for part in scope.split("|"):
            trimmed = part.strip().lower()
            if trimmed.startswith(prefix):
                return _normalize_scope_value(trimmed[len(prefix):])
    return None


def _include_in_leaderboard_filter():
    return or_(
        UserSettings.include_in_leaderboard.is_(True),
        UserSettings.user_id.is_(None),
    )


async def get_leaderboard_language_scopes(
    session: Session,
) -> list[tuple[str, dict[str, Any]]]:
    return [
        (f"language:{language}", {"language": language})
        for language in await get_leaderboard_languages(session)
    ]


async def get_leaderboard_languages(session: Session) -> list[str]:
    statement = (
        select(func.distinct(Repository.primary_language))
        .outerjoin(ProviderInstallation, ProviderInstallation.id == Repository.installation_id)
        .join(
            ProviderInstallationUser,
            ProviderInstallationUser.provider_installation_id == ProviderInstallation.id,
        )
        .outerjoin(UserSettings, UserSettings.user_id == ProviderInstallationUser.user_id)
        .where(
            Repository.primary_language.is_not(None),
            _include_in_leaderboard_filter(),
        )
    )
    languages = (await session.exec(statement)).all()
    values: list[str] = []
    seen: set[str] = set()
    for language in languages:
        if isinstance(language, str):
            normalized = _normalize_scope_value(language)
            if normalized and normalized not in seen:
                values.append(normalized)
                seen.add(normalized)
    return sorted(values)


async def get_leaderboard_country_scopes(
    session: Session,
) -> list[tuple[str, dict[str, Any]]]:
    return [
        (f"country:{country}", {"country": country})
        for country in await get_leaderboard_countries(session)
    ]


async def get_leaderboard_countries(session: Session) -> list[str]:
    statement = (
        select(func.distinct(UserSettings.country))
        .join(User, User.id == UserSettings.user_id)
        .where(
            UserSettings.country.is_not(None),
            User.handle.is_not(None),
            UserSettings.include_in_leaderboard.is_(True),
        )
    )
    countries = (await session.exec(statement)).all()
    values: list[str] = []
    seen: set[str] = set()
    for country in countries:
        if isinstance(country, str):
            normalized = _normalize_scope_value(country)
            if normalized and normalized not in seen:
                values.append(normalized)
                seen.add(normalized)
    return sorted(values)


def can_refresh_leaderboard(window: LeaderboardWindow, scope: str) -> bool:
    return window.period == "monthly" and scope == "global"


async def ensure_leaderboard_entries(
    session: Session,
    window: LeaderboardWindow,
    *,
    scope: str,
    scope_metadata: dict[str, Any] | None,
) -> None:
    if not can_refresh_leaderboard(window, scope):
        return
    start = to_utc_date(window.start)
    end = to_utc_date(window.end)
    latest_entry_statement = select(
        func.max(LeaderboardEntryRecord.computed_at)
    ).where(
        LeaderboardEntryRecord.period == window.period,
        LeaderboardEntryRecord.period_start == start,
        LeaderboardEntryRecord.period_end == end,
        LeaderboardEntryRecord.scope == scope,
    )
    latest_entry_time = (await session.exec(latest_entry_statement)).one()
    if isinstance(latest_entry_time, tuple):
        latest_entry_time = latest_entry_time[0]
    latest_snapshot_statement = select(
        func.max(ScoreSnapshot.computed_at)
    ).join(User).outerjoin(
        UserSettings, UserSettings.user_id == User.id
    ).where(
        ScoreSnapshot.period == window.period,
        ScoreSnapshot.period_start == start,
        ScoreSnapshot.period_end == end,
        User.handle.is_not(None),
        _include_in_leaderboard_filter(),
    )
    latest_snapshot_time = (await session.exec(latest_snapshot_statement)).one()
    if isinstance(latest_snapshot_time, tuple):
        latest_snapshot_time = latest_snapshot_time[0]
    if not latest_snapshot_time:
        return
    if not latest_entry_time or latest_snapshot_time > latest_entry_time:
        await refresh_leaderboard_entries_for_window(
            session,
            window,
            scope=scope,
            scope_metadata=scope_metadata,
        )


async def refresh_leaderboard_entries_for_window(
    session: Session,
    window: LeaderboardWindow,
    *,
    scope: str,
    scope_metadata: dict[str, Any] | None,
) -> list[LeaderboardEntryRecord]:
    if scope != "global":
        return await _refresh_activity_leaderboard_entries(
            session,
            window,
            scope=scope,
            scope_metadata=scope_metadata,
        )
    if window.period in {"daily", "weekly"}:
        return await _refresh_activity_leaderboard_entries(
            session,
            window,
            scope=scope,
            scope_metadata=scope_metadata,
        )
    return await _refresh_snapshot_leaderboard_entries(
        session,
        window,
        scope=scope,
        scope_metadata=scope_metadata,
    )


async def _refresh_snapshot_leaderboard_entries(
    session: Session,
    window: LeaderboardWindow,
    *,
    scope: str,
    scope_metadata: dict[str, Any] | None,
) -> list[LeaderboardEntryRecord]:
    if not can_refresh_leaderboard(window, scope):
        return []
    start = to_utc_date(window.start)
    end = to_utc_date(window.end)
    ranking_statement = (
        select(
            ScoreSnapshot.id.label("snapshot_id"),
            ScoreSnapshot.user_id,
            ScoreSnapshot.total_score,
            func.rank()
            .over(order_by=ScoreSnapshot.total_score.desc())
            .label("rank"),
        )
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            ScoreSnapshot.period == window.period,
            ScoreSnapshot.period_start == start,
            ScoreSnapshot.period_end == end,
            User.handle.is_not(None),
            _include_in_leaderboard_filter(),
        )
        .order_by(ScoreSnapshot.total_score.desc())
    )
    rows = (await session.exec(ranking_statement)).all()

    delete_statement = delete(LeaderboardEntryRecord).where(
        LeaderboardEntryRecord.period == window.period,
        LeaderboardEntryRecord.period_start == start,
        LeaderboardEntryRecord.period_end == end,
        LeaderboardEntryRecord.scope == scope,
    )
    await session.exec(delete_statement)

    entries: list[LeaderboardEntryRecord] = []
    for snapshot_id, user_id, total_score, rank in rows:
        entries.append(
            LeaderboardEntryRecord(
                user_id=user_id,
                period=window.period,
                period_start=start,
                period_end=end,
                scope=scope,
                scope_metadata=scope_metadata,
                total_score=total_score,
                rank=int(rank),
                score_snapshot_id=snapshot_id,
            )
        )
    session.add_all(entries)
    await session.commit()
    return entries


async def _refresh_activity_leaderboard_entries(
    session: Session,
    window: LeaderboardWindow,
    *,
    scope: str,
    scope_metadata: dict[str, Any] | None,
) -> list[LeaderboardEntryRecord]:
    language = _extract_scope_value(scope, scope_metadata, "language")
    country = _extract_scope_value(scope, scope_metadata, "country")
    if scope != "global" and not (language or country):
        return []
    start = to_utc_date(window.start)
    end = to_utc_date(window.end)
    metrics_statement = (
        select(
            ActivityFactDaily.user_id,
            ActivityFactDaily.metric_key,
            func.sum(ActivityFactDaily.value).label("total"),
        )
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == ActivityFactDaily.user_id)
        .where(
            ActivityFactDaily.day >= start,
            ActivityFactDaily.day <= end,
            ActivityFactDaily.metric_key.in_(SCORE_ACTIVITY_METRIC_KEYS),
            User.handle.is_not(None),
            _include_in_leaderboard_filter(),
        )
        .group_by(ActivityFactDaily.user_id, ActivityFactDaily.metric_key)
    )
    if language:
        metrics_statement = (
            metrics_statement.join(
                Repository, Repository.full_name == ActivityFactDaily.bucket
            ).where(Repository.primary_language == language)
        )
    if country:
        metrics_statement = metrics_statement.where(UserSettings.country == country)
    metric_rows = (await session.exec(metrics_statement)).all()

    repos_statement = (
        select(
            ActivityFactDaily.user_id,
            func.count(func.distinct(ActivityFactDaily.bucket)).label("repos_touched"),
        )
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == ActivityFactDaily.user_id)
        .where(
            ActivityFactDaily.day >= start,
            ActivityFactDaily.day <= end,
            ActivityFactDaily.metric_key.in_(SCORE_ACTIVITY_METRIC_KEYS),
            ActivityFactDaily.bucket != "global",
            User.handle.is_not(None),
            _include_in_leaderboard_filter(),
        )
        .group_by(ActivityFactDaily.user_id)
    )
    if language:
        repos_statement = (
            repos_statement.join(
                Repository, Repository.full_name == ActivityFactDaily.bucket
            ).where(Repository.primary_language == language)
        )
    if country:
        repos_statement = repos_statement.where(UserSettings.country == country)
    repos_rows = (await session.exec(repos_statement)).all()

    totals_by_user: dict[int, dict[str, float]] = {}
    for user_id, metric_key, total in metric_rows:
        totals = totals_by_user.setdefault(
            user_id, {key: 0.0 for key in SCORE_METRIC_KEYS}
        )
        totals[str(metric_key)] = float(total or 0)
    for user_id, repos_touched in repos_rows:
        totals = totals_by_user.setdefault(
            user_id, {key: 0.0 for key in SCORE_METRIC_KEYS}
        )
        totals["repos_touched"] = float(repos_touched or 0)

    scores: list[tuple[int, float]] = []
    for user_id, totals in totals_by_user.items():
        _, raw_total = compute_raw_totals(totals)
        if raw_total <= 0:
            continue
        scores.append((user_id, normalize_score(raw_total)))
    scores.sort(key=lambda entry: entry[1], reverse=True)

    delete_statement = delete(LeaderboardEntryRecord).where(
        LeaderboardEntryRecord.period == window.period,
        LeaderboardEntryRecord.period_start == start,
        LeaderboardEntryRecord.period_end == end,
        LeaderboardEntryRecord.scope == scope,
    )
    await session.exec(delete_statement)

    entries: list[LeaderboardEntryRecord] = []
    last_score: float | None = None
    rank = 0
    for index, (user_id, total_score) in enumerate(scores, start=1):
        if last_score is None or total_score != last_score:
            rank = index
            last_score = total_score
        entries.append(
            LeaderboardEntryRecord(
                user_id=user_id,
                period=window.period,
                period_start=start,
                period_end=end,
                scope=scope,
                scope_metadata=scope_metadata,
                total_score=total_score,
                rank=rank,
            )
        )
    session.add_all(entries)
    await session.commit()
    return entries


def build_leaderboard_queryset(window: LeaderboardWindow, *, scope: str):
    start = to_utc_date(window.start)
    end = to_utc_date(window.end)
    return (
        select(LeaderboardEntryRecord)
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            LeaderboardEntryRecord.period == window.period,
            LeaderboardEntryRecord.period_start == start,
            LeaderboardEntryRecord.period_end == end,
            LeaderboardEntryRecord.scope == scope,
            _include_in_leaderboard_filter(),
        )
        .options(selectinload(LeaderboardEntryRecord.user))
        .order_by(
            LeaderboardEntryRecord.rank.asc(),
            LeaderboardEntryRecord.total_score.desc(),
        )
    )


async def clear_leaderboard_cache() -> dict[str, int]:
    return {
        "list": await delete_by_prefix(LEADERBOARD_LIST_CACHE_PREFIX),
        "scope": await delete_by_prefix(LEADERBOARD_SCOPE_CACHE_PREFIX),
    }
