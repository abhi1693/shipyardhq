from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import ActivityFactDaily, ScoreSnapshot, User, UserSettings

SCORE_METRIC_WEIGHTS = {
    "commits": 0.6,
    "prs_merged": 4,
    "reviews": 2,
    "issues_closed": 1,
    "repos_touched": 2,
}

SCORE_METRIC_KEYS = list(SCORE_METRIC_WEIGHTS.keys())
SCORE_ACTIVITY_METRIC_KEYS = [key for key in SCORE_METRIC_KEYS if key != "repos_touched"]
SCORE_ACTIVITY_METRIC_KEY_SET = set(SCORE_ACTIVITY_METRIC_KEYS)
ACTIVITY_METRIC_KEYS = [*SCORE_ACTIVITY_METRIC_KEYS, "prs_opened", "issues_opened"]

ScorePeriod = Literal["monthly"]

SCORE_PERIOD_LABELS: dict[ScorePeriod, str] = {
    "monthly": "Monthly",
}


@dataclass(frozen=True)
class PeriodWindow:
    period: ScorePeriod
    label: str
    start: datetime
    end: datetime
    days: int


@dataclass
class ActivitySummary:
    totals: dict[str, float]
    active_days: int
    day_totals: dict[str, float]
    activity_day_totals: dict[str, float]
    repo_totals: dict[str, float]
    repos_touched: int
    has_data: bool
    has_scored_data: bool


@dataclass
class ScoreValues:
    total_score: float
    consistency_score: float
    momentum_score: float
    impact_score: float
    metrics: dict[str, object]


def round_to(value: float, decimals: int = 1) -> float:
    factor = 10**decimals
    return round(value * factor) / factor


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


def normalize_score(raw: float) -> float:
    return round_to(100 * (1 - math.exp(-raw / 40)))


def to_utc_date(value: datetime | date) -> date:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date()
    return value


def to_utc_datetime(value: datetime | date) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)


def add_utc_days(value: datetime, days: int) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value + timedelta(days=days)


def format_day_key(value: date | datetime) -> str:
    return to_utc_date(value).isoformat()


def resolve_score_period(value: str | None) -> ScorePeriod:
    if value == "monthly":
        return "monthly"
    return "monthly"


def get_period_window(period: ScorePeriod, now: datetime | None = None) -> PeriodWindow:
    now = now or datetime.now(timezone.utc)
    year = now.year
    month = now.month
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    next_month = datetime(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1, tzinfo=timezone.utc)
    end = next_month - timedelta(days=1)
    days = end.day
    return PeriodWindow(
        period=period,
        label=SCORE_PERIOD_LABELS[period],
        start=start,
        end=end,
        days=days,
    )


async def get_activity_summary_for_period(
    session: Session, user_id: int, window: PeriodWindow
) -> ActivitySummary:
    facts_statement = select(ActivityFactDaily).where(
        ActivityFactDaily.user_id == user_id,
        ActivityFactDaily.day >= to_utc_date(window.start),
        ActivityFactDaily.day <= to_utc_date(window.end),
        ActivityFactDaily.metric_key.in_(ACTIVITY_METRIC_KEYS),
    )
    facts = (await session.exec(facts_statement)).all()

    totals = {key: 0.0 for key in SCORE_METRIC_KEYS}
    day_totals: dict[str, float] = {}
    activity_day_totals: dict[str, float] = {}
    repo_totals: dict[str, float] = {}
    scored_repos: set[str] = set()
    has_scored_data = False

    for fact in facts:
        day_key = format_day_key(fact.day)
        activity_day_totals[day_key] = activity_day_totals.get(day_key, 0) + fact.value

        if fact.metric_key in SCORE_ACTIVITY_METRIC_KEY_SET:
            metric_key = fact.metric_key
            weight = SCORE_METRIC_WEIGHTS.get(metric_key, 1)
            totals[metric_key] += fact.value
            day_totals[day_key] = day_totals.get(day_key, 0) + fact.value
            has_scored_data = True

            if fact.bucket and fact.bucket != "global":
                repo_totals[fact.bucket] = repo_totals.get(fact.bucket, 0) + fact.value * weight
                scored_repos.add(fact.bucket)

    active_days = len([value for value in activity_day_totals.values() if value > 0])
    repos_touched = len(scored_repos)
    totals["repos_touched"] = float(repos_touched)

    return ActivitySummary(
        totals=totals,
        active_days=active_days,
        day_totals=day_totals,
        activity_day_totals=activity_day_totals,
        repo_totals=repo_totals,
        repos_touched=repos_touched,
        has_data=bool(facts),
        has_scored_data=has_scored_data,
    )


def get_previous_period_window(window: PeriodWindow) -> PeriodWindow:
    previous_month = window.start.replace(day=1) - timedelta(days=1)
    return get_period_window(window.period, previous_month)


def compute_raw_totals(totals: dict[str, float]) -> tuple[float, float]:
    raw_impact = (
        totals.get("prs_merged", 0) * SCORE_METRIC_WEIGHTS["prs_merged"]
        + totals.get("reviews", 0) * SCORE_METRIC_WEIGHTS["reviews"]
        + totals.get("repos_touched", 0) * SCORE_METRIC_WEIGHTS["repos_touched"]
    )
    raw_total = (
        totals.get("commits", 0) * SCORE_METRIC_WEIGHTS["commits"]
        + totals.get("issues_closed", 0) * SCORE_METRIC_WEIGHTS["issues_closed"]
        + raw_impact
    )
    return raw_impact, raw_total


def compute_score_values(
    summary: ActivitySummary,
    window: PeriodWindow,
    previous_summary: ActivitySummary | None = None,
) -> ScoreValues:
    raw_impact, raw_total = compute_raw_totals(summary.totals)
    consistency_score = round_to((summary.active_days / window.days) * 100) if window.days else 0

    previous_total = compute_raw_totals(previous_summary.totals)[1] if previous_summary else 0
    if previous_total == 0:
        momentum = 100 if raw_total > 0 else 0
    else:
        momentum = ((raw_total - previous_total) / previous_total) * 100
    momentum_score = round_to(clamp(momentum, -100, 100))

    return ScoreValues(
        total_score=normalize_score(raw_total),
        consistency_score=consistency_score,
        momentum_score=momentum_score,
        impact_score=normalize_score(raw_impact),
        metrics={
            "totals": summary.totals,
            "activeDays": summary.active_days,
            "daysInPeriod": window.days,
            "momentumPeriod": {
                "current": raw_total,
                "previous": previous_total,
            },
        },
    )


async def refresh_score_snapshot_for_period(
    session: Session, user_id: int, window: PeriodWindow, summary: ActivitySummary
) -> ScoreSnapshot | None:
    statement = select(ScoreSnapshot).where(
        ScoreSnapshot.user_id == user_id,
        ScoreSnapshot.period == window.period,
        ScoreSnapshot.period_start == to_utc_date(window.start),
        ScoreSnapshot.period_end == to_utc_date(window.end),
    )
    existing = (await session.exec(statement)).first()

    if not summary.has_scored_data:
        return existing

    previous_window = get_previous_period_window(window)
    previous_summary = await get_activity_summary_for_period(session, user_id, previous_window)
    scores = compute_score_values(summary, window, previous_summary)

    if existing:
        existing.total_score = scores.total_score
        existing.consistency_score = scores.consistency_score
        existing.momentum_score = scores.momentum_score
        existing.impact_score = scores.impact_score
        existing.metrics = scores.metrics
        existing.scoring_version = 1
        existing.computed_at = datetime.now(timezone.utc)
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return existing

    snapshot = ScoreSnapshot(
        user_id=user_id,
        period=window.period,
        period_start=to_utc_date(window.start),
        period_end=to_utc_date(window.end),
        total_score=scores.total_score,
        consistency_score=scores.consistency_score,
        momentum_score=scores.momentum_score,
        impact_score=scores.impact_score,
        metrics=scores.metrics,
        scoring_version=1,
    )
    session.add(snapshot)
    await session.commit()
    await session.refresh(snapshot)
    return snapshot


async def get_score_snapshot_for_period(
    session: Session, user_id: int, window: PeriodWindow
) -> ScoreSnapshot | None:
    statement = select(ScoreSnapshot).where(
        ScoreSnapshot.user_id == user_id,
        ScoreSnapshot.period == window.period,
        ScoreSnapshot.period_start == to_utc_date(window.start),
        ScoreSnapshot.period_end == to_utc_date(window.end),
    )
    return (await session.exec(statement)).first()


def _include_in_leaderboard_filter():
    return or_(
        UserSettings.include_in_leaderboard.is_(True),
        UserSettings.user_id.is_(None),
    )


async def is_user_in_leaderboard(session: Session, user_id: int) -> bool:
    statement = select(UserSettings.include_in_leaderboard).where(
        UserSettings.user_id == user_id
    )
    result = (await session.exec(statement)).first()
    if isinstance(result, tuple):
        result = result[0]
    if result is None:
        return True
    return bool(result)


async def get_snapshot_ranks(
    session: Session, snapshots: list[ScoreSnapshot]
) -> dict[int, int]:
    if not snapshots:
        return {}

    snapshot_ids = [snapshot.id for snapshot in snapshots]
    period_filters = []
    for period, period_start, period_end in {
        (snapshot.period, snapshot.period_start, snapshot.period_end) for snapshot in snapshots
    }:
        period_filters.append(
            and_(
                ScoreSnapshot.period == period,
                ScoreSnapshot.period_start == period_start,
                ScoreSnapshot.period_end == period_end,
            )
        )

    period_filter = (
        or_(*period_filters) if len(period_filters) > 1 else period_filters[0]
    )
    ranked_snapshots = (
        select(
            ScoreSnapshot.id.label("snapshot_id"),
            func.rank()
            .over(
                partition_by=(
                    ScoreSnapshot.period,
                    ScoreSnapshot.period_start,
                    ScoreSnapshot.period_end,
                ),
                order_by=ScoreSnapshot.total_score.desc(),
            )
            .label("rank"),
        )
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            User.handle.is_not(None),
            _include_in_leaderboard_filter(),
            period_filter,
        )
        .subquery()
    )
    statement = select(
        ranked_snapshots.c.snapshot_id,
        ranked_snapshots.c.rank,
    ).where(ranked_snapshots.c.snapshot_id.in_(snapshot_ids))
    ranks: dict[int, int] = {}
    for snapshot_id, rank in (await session.exec(statement)).all():
        ranks[snapshot_id] = int(rank)
    return ranks


async def get_leaderboard_snapshots(
    session: Session, window: PeriodWindow, limit: int = 25
) -> list[ScoreSnapshot]:
    statement = (
        select(ScoreSnapshot)
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            ScoreSnapshot.period == window.period,
            ScoreSnapshot.period_start == to_utc_date(window.start),
            ScoreSnapshot.period_end == to_utc_date(window.end),
            User.handle.is_not(None),
            _include_in_leaderboard_filter(),
        )
        .options(selectinload(ScoreSnapshot.user))
        .order_by(ScoreSnapshot.total_score.desc())
        .limit(limit)
    )
    return (await session.exec(statement)).all()


async def get_user_snapshot_history(
    session: Session, user_id: int, period: ScorePeriod, limit: int = 5
) -> list[ScoreSnapshot]:
    statement = (
        select(ScoreSnapshot)
        .where(ScoreSnapshot.user_id == user_id, ScoreSnapshot.period == period)
        .order_by(ScoreSnapshot.period_start.desc())
        .limit(limit)
    )
    return (await session.exec(statement)).all()


async def get_rank_for_snapshot(
    session: Session, snapshot: ScoreSnapshot
) -> int | None:
    if not await is_user_in_leaderboard(session, snapshot.user_id):
        return None
    statement = (
        select(func.count())
        .select_from(ScoreSnapshot)
        .join(User)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .where(
            ScoreSnapshot.period == snapshot.period,
            ScoreSnapshot.period_start == snapshot.period_start,
            ScoreSnapshot.period_end == snapshot.period_end,
            ScoreSnapshot.total_score > snapshot.total_score,
            User.handle.is_not(None),
            _include_in_leaderboard_filter(),
        )
    )
    higher_scores = (await session.exec(statement)).one()
    if isinstance(higher_scores, tuple):
        higher_scores = higher_scores[0]
    return int(higher_scores or 0) + 1


def build_activity_series(
    day_totals: dict[str, float], end_date: datetime, length: int = 12
) -> list[int]:
    end = to_utc_datetime(end_date)
    start = add_utc_days(end, -(length - 1))
    values: list[float] = []

    for index in range(length):
        day_key = format_day_key(add_utc_days(start, index))
        values.append(day_totals.get(day_key, 0))

    max_value = max(1, *values)
    return [round((value / max_value) * 100) for value in values]


def build_activity_series_for_window(
    day_totals: dict[str, float], window: PeriodWindow, buckets: int = 12
) -> list[int]:
    days = window.days
    bucket_count = min(buckets, days)
    values = [0.0 for _ in range(bucket_count)]
    start = to_utc_datetime(window.start)

    for day_index in range(days):
        day_key = format_day_key(add_utc_days(start, day_index))
        value = day_totals.get(day_key, 0)
        bucket_index = min(bucket_count - 1, math.floor((day_index * bucket_count) / days))
        values[bucket_index] += value

    max_value = max(1, *values)
    return [round((value / max_value) * 100) for value in values]


def get_streak_days(day_totals: dict[str, float], end_date: datetime) -> int:
    streak = 0
    cursor = to_utc_datetime(end_date)

    while True:
        day_key = format_day_key(cursor)
        if day_totals.get(day_key, 0) <= 0:
            break
        streak += 1
        cursor = add_utc_days(cursor, -1)

    return streak


def format_score(value: float | None, decimals: int = 1) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "--"
    return f"{value:.{decimals}f}"
