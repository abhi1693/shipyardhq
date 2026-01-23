from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from models import Provider
from services.schemas.base import BaseModelSerializer, BaseSerializer
from services.schemas.sync_runs import SyncRunSummary


class ProfileUser(BaseModelSerializer):
    id: int
    clerk_id: str
    handle: str | None = None
    display_name: str | None = Field(default=None, validation_alias="displayName")
    avatar_url: str | None = Field(default=None, validation_alias="avatarUrl")


class ProfileSummary(BaseModelSerializer):
    handle: str | None = None
    display_name: str | None = Field(default=None, validation_alias="displayName")
    avatar_url: str | None = Field(default=None, validation_alias="avatarUrl")


class PeriodWindowResponse(BaseSerializer):
    period: str
    label: str
    start: datetime
    end: datetime
    days: int


class ActivitySummaryResponse(BaseSerializer):
    totals: dict[str, float]
    active_days: int = Field(validation_alias="activeDays")
    day_totals: dict[str, float] = Field(validation_alias="dayTotals")
    activity_day_totals: dict[str, float] = Field(validation_alias="activityDayTotals")
    repo_totals: dict[str, float] = Field(validation_alias="repoTotals")
    repos_touched: int = Field(validation_alias="reposTouched")
    has_data: bool = Field(validation_alias="hasData")
    has_scored_data: bool = Field(validation_alias="hasScoredData")


class ScoreSnapshotResponse(BaseModelSerializer):
    id: int
    user_id: int = Field(validation_alias="userId")
    period: str
    period_start: date = Field(validation_alias="periodStart")
    period_end: date = Field(validation_alias="periodEnd")
    total_score: float = Field(validation_alias="totalScore")
    consistency_score: float = Field(validation_alias="consistencyScore")
    momentum_score: float = Field(validation_alias="momentumScore")
    impact_score: float = Field(validation_alias="impactScore")
    metrics: dict[str, Any] | None = None
    scoring_version: int = Field(validation_alias="scoringVersion")
    computed_at: datetime = Field(validation_alias="computedAt")
    rank: int | None = None


class RepoActivityResponse(BaseSerializer):
    name: str
    total: float
    total_display: str | None = None


class ActivityItemResponse(BaseModelSerializer):
    id: int
    provider: Provider
    provider_item_id: str = Field(validation_alias="providerItemId")
    type: str
    occurred_at: datetime = Field(validation_alias="occurredAt")
    repo_full_name: str | None = Field(default=None, validation_alias="repoFullName")
    title: str | None = None
    number: int | None = None
    metadata: dict[str, Any] | None = None
    label: str | None = None
    detail: str | None = None
    repo: str | None = None
    summary: str | None = None
    scored: bool | None = None
    occurred_at_label: str | None = None


class ProfileDisplayItem(BaseSerializer):
    label: str
    value: str
    tooltip: str | None = None


class ProfileStatCard(ProfileDisplayItem):
    icon: str | None = None


class ProfilePeriodOption(BaseSerializer):
    value: str
    label: str


class ProfileTrendPoint(BaseSerializer):
    period: str
    score: float
    rank: int | None = None


class ProfileHistoryItem(BaseModelSerializer):
    id: int
    month: str
    rank: int | None = None


class ProfileDisplayResponse(BaseSerializer):
    resolved_handle: str
    avatar_label: str
    score_window_label: str
    snapshot_score_display: str
    momentum_label: str
    momentum_message: str
    momentum_message_emphasis: bool = False
    last_sync_label: str
    sync_status: str
    sync_summary: str | None = None
    warning_count: int = 0
    period_options: list[ProfilePeriodOption] = Field(default_factory=list)
    selected_period_value: str
    trend_data: list[ProfileTrendPoint] = Field(default_factory=list)
    trend_highlight_index: int | None = None
    history_items: list[ProfileHistoryItem] = Field(default_factory=list)
    stat_cards: list[ProfileStatCard] = Field(default_factory=list)
    breakdown_items: list[ProfileDisplayItem] = Field(default_factory=list)
    highlights: list[ProfileDisplayItem] = Field(default_factory=list)
    show_owner_hint: bool = False


class UserProfileResponse(BaseSerializer):
    ok: bool
    user: ProfileUser
    is_owner: bool = Field(validation_alias="isOwner")
    period: str
    period_value: str = Field(validation_alias="periodValue")
    window: PeriodWindowResponse
    summary: ActivitySummaryResponse
    activity_series: list[int] = Field(default_factory=list, validation_alias="activitySeries")
    streak_days: int = Field(default=0, validation_alias="streakDays")
    snapshot: ScoreSnapshotResponse | None = None
    history: list[ScoreSnapshotResponse] = Field(default_factory=list)
    is_fallback_period: bool = Field(default=False, validation_alias="isFallbackPeriod")
    top_repos: list[RepoActivityResponse] = Field(default_factory=list, validation_alias="topRepos")
    recent_activity: list[ActivityItemResponse] = Field(
        default_factory=list, validation_alias="recentActivity"
    )
    latest_sync: SyncRunSummary | None = Field(default=None, validation_alias="latestSync")
    display: ProfileDisplayResponse


SentimentLabel = Literal["positive", "negative", "neutral"]


class ProfileHero(BaseSerializer):
    handle: str
    display_name: str | None = None
    avatar_url: str | None = None
    rank_display: str | None = None
    joined_label: str | None = None
    last_sync_label: str | None = None
    period_label: str | None = None
    is_owner: bool


class ProfileHeroResponse(BaseSerializer):
    ok: bool
    hero: ProfileHero


class ProfileMetric(BaseSerializer):
    label: str
    value_display: str
    value_raw: float | int | None = None
    sentiment: SentimentLabel | None = None
    delta: float | int | None = None
    info: str | None = None


class ProfileScoreRankTrendSummary(BaseSerializer):
    score_display: str | None = None
    momentum_display: str | None = None
    momentum_sentiment: SentimentLabel | None = None
    momentum_delta: float | None = None
    rank_display: str | None = None
    rank_delta_display: str | None = None
    rank_delta_sentiment: SentimentLabel | None = None
    rank_delta: int | None = None


class ProfileScoreRankTrendPoint(BaseSerializer):
    period_key: str
    period_label: str
    score: float | None = None
    rank: int | None = None
    rank_bar: float | None = None


class ProfileScoreRankTrendChart(BaseSerializer):
    info: str | None = None
    summary: ProfileScoreRankTrendSummary | None = None
    series: list[ProfileScoreRankTrendPoint] = Field(default_factory=list)
    score_domain: list[float] | None = None
    rank_bar_domain: list[float] | None = None
    score_ticks: list[float] | None = None
    rank_ticks: list[float] | None = None


class ProfileCompositionSegment(BaseSerializer):
    key: str
    label: str
    value: float
    percent: float
    color: str


class ProfileCompositionChart(BaseSerializer):
    info: str | None = None
    total_display: str
    total_value: float | None = None
    segments: list[ProfileCompositionSegment] = Field(default_factory=list)


class ProfileCharts(BaseSerializer):
    score_rank_trend: ProfileScoreRankTrendChart
    composition: ProfileCompositionChart


class ProfileTopRepoItem(BaseSerializer):
    name: str
    total_display: str | None = None
    total_value: float | None = None
    percent_of_max: float | None = None


class ProfileActivityDistributionItem(BaseSerializer):
    label: str
    value_display: str
    value_raw: float | None = None
    percent: float | None = None


class ProfileActivityDistribution(BaseSerializer):
    items: list[ProfileActivityDistributionItem] = Field(default_factory=list)
    total_display: str
    info: str | None = None


class ProfileRecentActivityItem(BaseSerializer):
    id: str
    label: str
    detail: str | None = None
    summary: str | None = None
    occurred_at_label: str | None = None
    repo: str | None = None
    url: str | None = None
    scored: bool | None = None


class ProfileLists(BaseSerializer):
    top_repos: list[ProfileTopRepoItem] = Field(default_factory=list)
    top_repos_info: str | None = None
    activity_distribution: ProfileActivityDistribution
    recent_activity: list[ProfileRecentActivityItem] = Field(default_factory=list)
    recent_activity_info: str | None = None
    info: str | None = None


class ProfileMetadata(BaseSerializer):
    period_options: list[ProfilePeriodOption] = Field(default_factory=list)
    selected_period_value: str | None = None


class ProfileView(BaseSerializer):
    hero: ProfileHero
    metrics: list[ProfileMetric] = Field(default_factory=list)
    charts: ProfileCharts
    lists: ProfileLists
    metadata: ProfileMetadata


class ProfileViewResponse(BaseSerializer):
    ok: bool
    profile_view: ProfileView
