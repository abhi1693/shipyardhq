from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from sqlalchemy import or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUserId
from database import get_session
from routers.base import api_prefix
from routers.generics import ListAPIView, NonModelRetrieveAPIView
from services.activity import (
    build_activity_item_display,
    get_recent_activity_items_for_period,
    get_top_repo_activity_for_period,
)
from services.cache import cached_json
from services.display import (
    EM_DASH,
    format_count,
    format_date_label,
    format_datetime_label,
    format_month_year,
    format_month_year_short,
    format_momentum_label,
    format_percent,
    format_period_value,
    format_score,
)
from services.scoring import (
    SCORE_METRIC_WEIGHTS,
    get_activity_summary_for_period,
    get_period_window,
    get_rank_for_snapshot,
    get_score_snapshot_for_period,
    get_snapshot_ranks,
    get_streak_days,
    get_user_snapshot_history,
    normalize_score,
    resolve_score_period,
    to_utc_datetime,
)
from services.schemas.profile import (
    ProfilePeriodOption,
    ProfileActivityDistribution,
    ProfileActivityDistributionItem,
    ProfileCharts,
    ProfileCompositionChart,
    ProfileCompositionSegment,
    ProfileHero,
    ProfileHeroResponse,
    ProfileSummary,
    ProfileLists,
    ProfileMetadata,
    ProfileMetric,
    ProfileRecentActivityItem,
    ProfileScoreRankTrendChart,
    ProfileScoreRankTrendPoint,
    ProfileScoreRankTrendSummary,
    ProfileTopRepoItem,
    ProfileView,
    ProfileViewResponse,
    SentimentLabel,
)
from services.sync_runs import get_latest_sync_run_for_user
from services.settings import get_user_settings_or_default
from services.users import get_user_by_clerk_id, get_user_by_handle
from services.rate_limit import public_rate_limit
from settings import get_settings
from models import Provider, User, UserSettings


def parse_period_value(value: str | None) -> date | None:
    if not value:
        return None
    parts = value.split("-")
    if len(parts) != 2:
        return None
    try:
        year = int(parts[0])
        month = int(parts[1])
        return date(year, month, 1)
    except ValueError:
        return None


settings = get_settings()

PROFILE_CACHE_PREFIX = "profiles:detail"

METRIC_LABELS = {
    "commits": "Commits",
    "prs_merged": "PRs merged",
    "reviews": "Reviews",
    "issues_closed": "Issues closed",
    "repos_touched": "Repos touched",
}
METRIC_INFO = {
    "Score": "Composite score for this period. Delta compares to the previous period.",
    "Consistency": "Share of days with activity this period. Delta compares to the previous period.",
    "Momentum": "Trend change vs previous period. Delta is the momentum value.",
    "Streak": "Consecutive days with activity ending at period end.",
    "Impact": "Weighted score from PRs merged, reviews, and repos touched. Delta compares to the previous period.",
    "PRs Merged": "Pull requests merged this period. Delta compares to the previous period.",
    "Reviews": "Pull request reviews submitted this period. Delta compares to the previous period.",
    "Active Days": "Days with any activity this period. Delta compares to the previous period.",
}
METRIC_COLORS = {
    "commits": "#0ea5e9",
    "prs_merged": "#f97316",
    "reviews": "#22c55e",
    "issues_closed": "#e11d48",
    "repos_touched": "#8b5cf6",
}
SCORE_RANK_TREND_INFO = "Score and rank over recent periods."
COMPOSITION_INFO = "Weighted contribution of each metric to the score."
TOP_REPOS_INFO = "Top repos by scored activity in this period."
ACTIVITY_DISTRIBUTION_INFO = "Distribution of activity types in this period."
RECENT_ACTIVITY_INFO = "Most recent activity items in this period."
LISTS_INFO = "Activity breakdowns for the selected period."

COMPOSITION_KEYS = ("commits", "prs_merged", "reviews", "issues_closed", "repos_touched")
ACTIVITY_DISTRIBUTION_KEYS = ("commits", "prs_merged", "reviews", "issues_closed")


def resolve_sentiment(value: float | int | None) -> SentimentLabel | None:
    if value is None:
        return None
    if value > 0:
        return "positive"
    if value < 0:
        return "negative"
    return "neutral"


def format_delta_display(value: int | None) -> str | None:
    if value is None:
        return None
    sign = "+" if value > 0 else ""
    return f"{sign}{value}"


def resolve_metric_label(key: str) -> str:
    return METRIC_LABELS.get(key, key.replace("_", " ").title())


def resolve_metric_color(key: str) -> str:
    return METRIC_COLORS.get(key, "#4b5563")


def calculate_percent(value: float, total: float) -> float | None:
    if total <= 0:
        return None
    return round((value / total) * 100, 1)


def coerce_number(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def extract_snapshot_totals(snapshot) -> dict[str, float]:
    if not snapshot or not isinstance(snapshot.metrics, dict):
        return {}
    totals = snapshot.metrics.get("totals")
    if not isinstance(totals, dict):
        return {}
    resolved: dict[str, float] = {}
    for key, value in totals.items():
        numeric = coerce_number(value)
        if numeric is not None:
            resolved[key] = numeric
    return resolved


def extract_snapshot_active_days(snapshot) -> int | None:
    if not snapshot or not isinstance(snapshot.metrics, dict):
        return None
    active_days = coerce_number(snapshot.metrics.get("activeDays"))
    if active_days is None:
        return None
    return int(active_days)


def compute_delta(current: float | int | None, previous: float | int | None) -> float | None:
    if current is None or previous is None:
        return None
    return float(current) - float(previous)


def cap_float(value: float | int | None, decimals: int = 2) -> float | int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    return round(float(value), decimals)


async def _build_user_profile_hero_response(
    session: Session,
    user,
    user_id: CurrentUserId,
    handle_label: str,
    period: str | None = None,
    period_key: str | None = None,
) -> ProfileHeroResponse:
    is_owner = bool(user_id and user_id == user.clerk_id)
    settings = await get_user_settings_or_default(session, user.id)
    if not is_owner and not settings.profile_public:
        raise HTTPException(status_code=404, detail="User not found.")

    latest_sync = (
        await get_latest_sync_run_for_user(session, user.id, Provider.GITHUB)
        if is_owner
        else None
    )

    period_value = resolve_score_period(period_key)
    requested_period_date = parse_period_value(period)
    if requested_period_date:
        window = get_period_window(period_value, to_utc_datetime(requested_period_date))
    else:
        window = get_period_window(period_value)

    rank_display = None
    snapshot = await get_score_snapshot_for_period(session, user.id, window)
    if snapshot:
        rank_value = await get_rank_for_snapshot(session, snapshot)
        if rank_value is not None:
            rank_display = f"#{rank_value}"

    last_sync_label = None
    if latest_sync:
        last_sync_timestamp = latest_sync.finished_at or latest_sync.started_at
        if last_sync_timestamp:
            last_sync_label = format_datetime_label(last_sync_timestamp)
    elif is_owner:
        last_sync_label = "Not synced yet"

    hero = ProfileHero(
        handle=user.handle or handle_label,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        rank_display=rank_display,
        joined_label=format_month_year(user.created_at) if user.created_at else None,
        last_sync_label=last_sync_label,
        period_label=format_month_year(window.start),
        is_owner=is_owner,
    )

    return ProfileHeroResponse(ok=True, hero=hero)


async def _build_user_profile_response(
    session: Session,
    user,
    user_id: CurrentUserId,
    handle_label: str,
    period: str | None = None,
    period_key: str | None = None,
    user_settings: UserSettings | None = None,
):
    is_owner = bool(user_id and user_id == user.clerk_id)
    if user_settings is None:
        user_settings = await get_user_settings_or_default(session, user.id)
    if not is_owner and not user_settings.profile_public:
        raise HTTPException(status_code=404, detail="User not found.")
    show_repos = user_settings.show_repos or is_owner
    show_commits = user_settings.show_commits or is_owner
    latest_sync = (
        await get_latest_sync_run_for_user(session, user.id, Provider.GITHUB)
        if is_owner
        else None
    )

    period_value = resolve_score_period(period_key)
    current_window = get_period_window(period_value)
    current_summary = await get_activity_summary_for_period(session, user.id, current_window)
    current_snapshot = await get_score_snapshot_for_period(session, user.id, current_window)

    history_snapshots = await get_user_snapshot_history(session, user.id, period_value, 12)
    latest_snapshot = history_snapshots[0] if history_snapshots else None

    requested_period_date = parse_period_value(period)
    requested_snapshot = None
    if requested_period_date:
        for snapshot in history_snapshots:
            if snapshot.period_start == requested_period_date:
                requested_snapshot = snapshot
                break

    window = current_window
    summary = current_summary
    snapshot = current_snapshot

    if requested_snapshot:
        requested_window = get_period_window(
            period_value, to_utc_datetime(requested_snapshot.period_start)
        )
        window = requested_window
        summary = await get_activity_summary_for_period(session, user.id, requested_window)
        snapshot = requested_snapshot
    elif not snapshot and latest_snapshot:
        fallback_window = get_period_window(
            period_value, to_utc_datetime(latest_snapshot.period_start)
        )
        window = fallback_window
        summary = await get_activity_summary_for_period(session, user.id, fallback_window)
        snapshot = latest_snapshot

    history_ranks = (
        await get_snapshot_ranks(session, history_snapshots)
        if history_snapshots
        else {}
    )
    history_sorted = sorted(
        history_snapshots, key=lambda entry: entry.period_start, reverse=True
    )
    period_value_display = format_period_value(window.start)
    period_options = [
        ProfilePeriodOption(
            value=format_period_value(entry.period_start),
            label=format_month_year_short(entry.period_start),
        )
        for entry in history_sorted
    ]
    trend_snapshots = list(reversed(history_sorted))

    rank_values = [rank for rank in history_ranks.values() if rank is not None]
    max_rank = max(rank_values) if rank_values else None

    score_values: list[float] = []
    trend_series = []
    for entry in trend_snapshots:
        rank_value = history_ranks.get(entry.id)
        rank_bar = None
        if rank_value is not None and max_rank is not None:
            rank_bar = float(max_rank - rank_value + 1)
        if entry.total_score is not None:
            score_values.append(entry.total_score)
        trend_series.append(
            ProfileScoreRankTrendPoint(
                period_key=format_period_value(entry.period_start),
                period_label=format_month_year_short(entry.period_start),
                score=entry.total_score,
                rank=rank_value,
                rank_bar=rank_bar,
            )
        )

    score_domain = (
        [cap_float(min(score_values)), cap_float(max(score_values))]
        if score_values
        else None
    )
    rank_bar_domain = [0.0, float(max_rank)] if max_rank is not None else None
    streak_end = min(window.end, datetime.now(timezone.utc))
    streak_days = get_streak_days(summary.activity_day_totals, streak_end)

    top_repos = (
        await get_top_repo_activity_for_period(session, user.id, window, 5)
        if show_repos
        else []
    )
    recent_items = await get_recent_activity_items_for_period(session, user.id, window, 8)
    if not show_commits:
        recent_items = [
            item for item in recent_items if item.type != "commit"
        ]

    recent_activity = []
    for item in recent_items:
        display = build_activity_item_display(item)
        detail = display.detail
        repo_label = display.repo
        if not show_repos:
            if detail == item.repo_full_name:
                detail = None
            repo_label = None
        recent_activity.append(
            ProfileRecentActivityItem(
                id=str(item.id),
                label=display.label,
                detail=detail,
                summary=display.summary,
                occurred_at_label=format_date_label(item.occurred_at),
                repo=repo_label,
                url=item.url,
                scored=display.scored,
            )
        )

    summary_totals = dict(summary.totals or {})
    if not show_commits:
        summary_totals["commits"] = 0.0
    if not show_repos:
        summary_totals["repos_touched"] = 0.0
    resolved_handle = user.handle or handle_label
    has_snapshot = snapshot is not None
    has_data = summary.has_data or has_snapshot
    score_window_label = format_month_year(window.start)
    momentum_label = format_momentum_label(snapshot.momentum_score if snapshot else None)
    rank_value = None
    if snapshot:
        rank_value = history_ranks.get(snapshot.id)
        if rank_value is None:
            rank_value = await get_rank_for_snapshot(session, snapshot)

    previous_snapshot = None
    if snapshot:
        for index, entry in enumerate(history_sorted):
            if entry.id == snapshot.id:
                if index + 1 < len(history_sorted):
                    previous_snapshot = history_sorted[index + 1]
                break

    previous_rank = None
    if previous_snapshot:
        previous_rank = history_ranks.get(previous_snapshot.id)
        if previous_rank is None:
            previous_rank = await get_rank_for_snapshot(session, previous_snapshot)

    previous_totals = extract_snapshot_totals(previous_snapshot)
    previous_active_days = extract_snapshot_active_days(previous_snapshot)

    rank_delta = (
        previous_rank - rank_value
        if rank_value is not None and previous_rank is not None
        else None
    )
    score_delta = cap_float(
        compute_delta(
        snapshot.total_score if snapshot else None,
        previous_snapshot.total_score if previous_snapshot else None,
        )
    )

    score_display = (
        format_score(snapshot.total_score if snapshot else None)
        if has_snapshot
        else "Unranked" if summary.has_data else EM_DASH
    )
    rank_display = (
        f"#{rank_value}"
        if rank_value is not None
        else "Unranked" if summary.has_data else EM_DASH
    )
    streak_display = f"{streak_days} days" if has_data else EM_DASH

    prs_merged_value = float(summary_totals.get("prs_merged", 0) or 0)
    reviews_value = float(summary_totals.get("reviews", 0) or 0)
    prs_merged_current = prs_merged_value if has_data else None
    reviews_current = reviews_value if has_data else None
    active_days_value = summary.active_days if has_data else None
    prs_merged_delta = cap_float(
        compute_delta(prs_merged_current, previous_totals.get("prs_merged"))
    )
    reviews_delta = cap_float(
        compute_delta(reviews_current, previous_totals.get("reviews"))
    )
    active_days_delta = cap_float(
        compute_delta(active_days_value, previous_active_days)
    )
    momentum_delta = cap_float(snapshot.momentum_score if snapshot else None)
    consistency_value = snapshot.consistency_score if snapshot else None
    impact_value = snapshot.impact_score if snapshot else None
    consistency_delta = cap_float(
        compute_delta(
            consistency_value,
            previous_snapshot.consistency_score if previous_snapshot else None,
        )
    )
    impact_delta = cap_float(
        compute_delta(
            impact_value,
            previous_snapshot.impact_score if previous_snapshot else None,
        )
    )
    consistency_display = format_percent(consistency_value)
    impact_display = format_score(impact_value)

    metrics = [
        ProfileMetric(
            label="Score",
            value_display=score_display,
            value_raw=cap_float(snapshot.total_score if snapshot else None),
            sentiment=resolve_sentiment(score_delta),
            delta=score_delta,
            info=METRIC_INFO.get("Score"),
        ),
        ProfileMetric(
            label="Consistency",
            value_display=consistency_display,
            value_raw=cap_float(consistency_value),
            sentiment=resolve_sentiment(consistency_delta),
            delta=consistency_delta,
            info=METRIC_INFO.get("Consistency"),
        ),
        ProfileMetric(
            label="Momentum",
            value_display=momentum_label,
            value_raw=cap_float(snapshot.momentum_score if snapshot else None),
            sentiment=resolve_sentiment(snapshot.momentum_score if snapshot else None),
            delta=momentum_delta,
            info=METRIC_INFO.get("Momentum"),
        ),
        ProfileMetric(
            label="Impact",
            value_display=impact_display,
            value_raw=cap_float(impact_value),
            sentiment=resolve_sentiment(impact_delta),
            delta=impact_delta,
            info=METRIC_INFO.get("Impact"),
        ),
        ProfileMetric(
            label="Streak",
            value_display=streak_display,
            value_raw=streak_days if has_data else None,
            sentiment=None,
            delta=None,
            info=METRIC_INFO.get("Streak"),
        ),
        ProfileMetric(
            label="PRs Merged",
            value_display=format_count(prs_merged_value) if has_data else EM_DASH,
            value_raw=cap_float(prs_merged_current),
            sentiment=resolve_sentiment(prs_merged_delta),
            delta=prs_merged_delta,
            info=METRIC_INFO.get("PRs Merged"),
        ),
        ProfileMetric(
            label="Reviews",
            value_display=format_count(reviews_value) if has_data else EM_DASH,
            value_raw=cap_float(reviews_current),
            sentiment=resolve_sentiment(reviews_delta),
            delta=reviews_delta,
            info=METRIC_INFO.get("Reviews"),
        ),
        ProfileMetric(
            label="Active Days",
            value_display=(
                f"{summary.active_days} / {window.days}" if has_data else EM_DASH
            ),
            value_raw=active_days_value,
            sentiment=resolve_sentiment(active_days_delta),
            delta=active_days_delta,
            info=METRIC_INFO.get("Active Days"),
        ),
    ]

    last_sync_label = None
    if latest_sync:
        last_sync_timestamp = latest_sync.finished_at or latest_sync.started_at
        if last_sync_timestamp:
            last_sync_label = format_datetime_label(last_sync_timestamp)
    elif is_owner:
        last_sync_label = "Not synced yet"

    top_repo_items = []
    if top_repos:
        max_repo_total = max(repo["total"] for repo in top_repos)
        for repo in top_repos:
            total_value = float(repo["total"] or 0)
            top_repo_items.append(
                ProfileTopRepoItem(
                    name=repo["name"],
                    total_display=format_score(total_value, 0),
            total_value=cap_float(total_value),
            percent_of_max=calculate_percent(total_value, max_repo_total),
        )
            )

    activity_values = [
        (key, float(summary_totals.get(key, 0) or 0))
        for key in ACTIVITY_DISTRIBUTION_KEYS
    ]
    activity_total = sum(value for _, value in activity_values)
    activity_items = [
        ProfileActivityDistributionItem(
            label=resolve_metric_label(key),
            value_display=format_count(value),
            value_raw=cap_float(value),
            percent=calculate_percent(value, activity_total),
        )
        for key, value in activity_values
    ]

    composition_values = []
    for key in COMPOSITION_KEYS:
        if key == "repos_touched" and not show_repos:
            continue
        value = float(summary_totals.get(key, 0) or 0)
        weighted_value = value * float(SCORE_METRIC_WEIGHTS.get(key, 1))
        if weighted_value <= 0:
            continue
        composition_values.append((key, cap_float(weighted_value)))

    composition_total = sum(value for _, value in composition_values)
    composition_segments = []
    if composition_total > 0:
        for key, value in composition_values:
            percent = calculate_percent(value, composition_total)
            composition_segments.append(
                ProfileCompositionSegment(
                    key=key,
                    label=resolve_metric_label(key),
                    value=cap_float(value),
                    percent=percent if percent is not None else 0.0,
                    color=resolve_metric_color(key),
                )
            )

    composition_total_display = (
        format_score(
            snapshot.total_score if snapshot else normalize_score(composition_total)
        )
        if composition_total > 0
        else EM_DASH
    )
    composition_total_value = (
        cap_float(composition_total) if composition_total > 0 else None
    )

    chart_summary = ProfileScoreRankTrendSummary(
        score_display=score_display,
        momentum_display=momentum_label,
        momentum_sentiment=resolve_sentiment(momentum_delta),
        momentum_delta=momentum_delta,
        rank_display=rank_display,
        rank_delta_display=format_delta_display(rank_delta),
        rank_delta_sentiment=resolve_sentiment(rank_delta),
        rank_delta=rank_delta,
    )

    hero = ProfileHero(
        handle=resolved_handle,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        rank_display=rank_display,
        joined_label=format_month_year(user.created_at) if user.created_at else None,
        last_sync_label=last_sync_label,
        period_label=score_window_label,
        is_owner=is_owner,
    )

    return ProfileViewResponse(
        ok=True,
        profile_view=ProfileView(
            hero=hero,
            metrics=metrics,
            charts=ProfileCharts(
                score_rank_trend=ProfileScoreRankTrendChart(
                    info=SCORE_RANK_TREND_INFO,
                    summary=chart_summary,
                    series=trend_series,
                    score_domain=score_domain,
                    rank_bar_domain=rank_bar_domain,
                ),
                composition=ProfileCompositionChart(
                    info=COMPOSITION_INFO,
                    total_display=composition_total_display,
                    total_value=composition_total_value,
                    segments=composition_segments,
                ),
            ),
            lists=ProfileLists(
                top_repos=top_repo_items,
                top_repos_info=TOP_REPOS_INFO,
                activity_distribution=ProfileActivityDistribution(
                    items=activity_items,
                    total_display=format_count(activity_total),
                    info=ACTIVITY_DISTRIBUTION_INFO,
                ),
                recent_activity=recent_activity,
                recent_activity_info=RECENT_ACTIVITY_INFO,
                info=LISTS_INFO,
            ),
            metadata=ProfileMetadata(
                period_options=period_options,
                selected_period_value=period_value_display,
            ),
        ),
    )


async def _get_user_profile(
    session: Session,
    handle: str,
    user_id: CurrentUserId,
    period: str | None = None,
    period_key: str | None = None,
    user: User | None = None,
    user_settings: UserSettings | None = None,
):
    if user is None:
        user = await get_user_by_handle(session, handle)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return await _build_user_profile_response(
        session=session,
        user=user,
        user_id=user_id,
        handle_label=handle,
        period=period,
        period_key=period_key,
        user_settings=user_settings,
    )


async def _get_current_user_hero(
    session: Session,
    user_id: CurrentUserId,
    period: str | None = None,
    period_key: str | None = None,
):
    user = await get_user_by_clerk_id(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    handle_label = user.handle or "unknown"
    return await _build_user_profile_hero_response(
        session=session,
        user=user,
        user_id=user_id,
        handle_label=handle_label,
        period=period,
        period_key=period_key,
    )


class ProfileDetailView(NonModelRetrieveAPIView):
    serializer_class = ProfileViewResponse
    lookup_field = "handle"

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("profiles"), tags=["profiles"])

    async def retrieve(
        self,
        handle: str,
        user_id: CurrentUserId,
        request: Request,
        _: None = Depends(public_rate_limit),
        period: str | None = Query(default=None),
        period_key: str | None = Query(default=None),
        session: Session = Depends(get_session),
    ):
        user = await get_user_by_handle(session, handle)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        user_settings = await get_user_settings_or_default(session, user.id)
        is_owner = bool(user_id and user_id == user.clerk_id)
        if not is_owner and not user_settings.profile_public:
            raise HTTPException(status_code=404, detail="User not found.")

        params = list(request.query_params.multi_items())
        params.append(("viewer", "owner" if is_owner else "public"))

        async def build_response():
            return await _get_user_profile(
                session=session,
                handle=handle,
                user_id=user_id,
                period=period,
                period_key=period_key,
                user=user,
                user_settings=user_settings,
            )

        return await cached_json(
            PROFILE_CACHE_PREFIX,
            ttl_seconds=settings.profile_cache_ttl_seconds,
            path=request.url.path,
            params=params,
            builder=build_response,
            encoder=jsonable_encoder,
        )

class ProfileMeDetailView(NonModelRetrieveAPIView):
    serializer_class = ProfileHeroResponse

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("profiles"), tags=["profiles"])

    def get_detail_path(self) -> str:
        return "/me"

    async def retrieve(
        self,
        user_id: CurrentUserId,
        period: str | None = Query(default=None),
        period_key: str | None = Query(default=None),
        session: Session = Depends(get_session),
    ):
        return await _get_current_user_hero(
            session=session,
            user_id=user_id,
            period=period,
            period_key=period_key,
        )


class ProfileListBaseView(ListAPIView):
    model = User
    serializer_class = ProfileSummary
    filterset_fields: set[str] = set()
    search_fields = {"handle", "display_name"}

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("profiles"), tags=["profiles"])

    async def list(
        self,
        request: Request,
        user_id: CurrentUserId,
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        request.state.clerk_id = user_id
        return await super().list(
            request=request,
            q=q,
            session=session,
            page=page,
            limit=limit,
            page_size=page_size,
        )

    def get_queryset(self, session: Session, *, request: Request | None = None):
        statement = (
            select(User)
            .outerjoin(UserSettings, UserSettings.user_id == User.id)
            .where(User.handle.is_not(None))
            .order_by(User.handle.asc())
        )
        public_filter = or_(
            UserSettings.profile_public.is_(True),
            UserSettings.user_id.is_(None),
        )
        if request:
            clerk_id = getattr(request.state, "clerk_id", None)
            if clerk_id:
                public_filter = or_(public_filter, User.clerk_id == clerk_id)
        return statement.where(public_filter)


class ProfileListView(ProfileListBaseView):
    pass


router = APIRouter()
router.include_router(ProfileListView().router)
router.include_router(ProfileMeDetailView().router)
router.include_router(ProfileDetailView().router)
