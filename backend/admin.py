from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI
import jwt
from jwt import PyJWKClient
from sqlalchemy import func, inspect
from sqlalchemy.orm import ColumnProperty
from sqlmodel import Session, select
from starlette.background import BackgroundTasks
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from starlette.routing import Route
from starlette.status import (
    HTTP_303_SEE_OTHER,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
)
from starlette.templating import Jinja2Templates
from starlette_admin.auth import AdminUser, AuthProvider, login_not_required
from starlette_admin.contrib.sqlmodel import Admin, ModelView
from starlette_admin.exceptions import LoginFailed
from starlette_admin.fields import BaseField
from starlette_admin.views import CustomView, DropDown, Link

from database import sync_engine
import models
from services.logger import AppLogger
from services.task_scheduler import (
    rq_enqueue_analytics_sync,
    rq_enqueue_leaderboard_refresh,
    rq_enqueue_rewards_backlinks,
    rq_enqueue_rewards_placements,
    rq_enqueue_rewards_streak,
)
from settings import get_settings

logger = AppLogger.get_logger(__name__)

_HEAVY_LIST_FIELDS = {
    "metadata_",
    "metrics",
    "payload",
    "permissions",
    "result",
    "scope_metadata",
}
_READONLY_EDIT_FIELDS = {"created_at", "updated_at"}

_PRODUCT_TRAFFIC_FIELDS = [
    "id",
    "product_id",
    "date",
    "source",
    "page_views",
    "unique_visitors",
    "sessions",
    "visitors",
    "created_at",
]
_SITE_TRAFFIC_FIELDS = [
    "id",
    "date",
    "source",
    "page_views",
    "unique_visitors",
    "sessions",
    "visitors",
    "created_at",
]

_MODEL_LIST_FIELDS: dict[type[models.SQLModel], list[str]] = {
    models.User: [
        "id",
        "email",
        "first_name",
        "last_name",
        "clerk_id",
        "role",
        "status",
        "created_at",
    ],
    models.MemberFeedback: [
        "id",
        "user_id",
        "subject",
        "status",
        "rating",
        "reward_eligible",
        "created_at",
    ],
    models.Category: ["id", "name", "slug", "created_at"],
    models.Plan: [
        "id",
        "name",
        "slug",
        "type",
        "price",
        "is_default",
        "created_at",
    ],
    models.PlanFeature: ["id", "name", "key", "created_at"],
    models.PlanFeatureAssignment: [
        "id",
        "plan_id",
        "feature_id",
        "enabled",
        "is_experimental",
        "created_at",
    ],
    models.UserPlanPurchase: [
        "id",
        "user_id",
        "plan_id",
        "external_id",
        "created_at",
    ],
    models.Product: [
        "id",
        "name",
        "slug",
        "user_id",
        "category_id",
        "status",
        "published_at",
        "created_at",
    ],
    models.ProductMetadata: ["id", "product_id", "github_url", "created_at"],
    models.ProductAnalytics: ["id", "product_id", "upvotes", "created_at"],
    models.ProductMedia: ["id", "product_id", "image_url", "created_at"],
    models.ProductVerification: [
        "id",
        "product_id",
        "is_verified",
        "verified_at",
        "created_at",
    ],
    models.ProductClaimAttempt: [
        "id",
        "product_id",
        "user_id",
        "method",
        "status",
        "created_at",
    ],
    models.ProductBadge: [
        "id",
        "product_id",
        "badge",
        "expires_at",
        "created_at",
    ],
    models.ProductUpvote: ["id", "product_id", "user_id", "created_at"],
    models.AlternativeProduct: ["id", "name", "slug", "website_url", "created_at"],
    models.UseCase: ["id", "label", "slug", "created_at"],
    models.LeaderboardRun: [
        "id",
        "period_start",
        "period_end",
        "status",
        "created_at",
    ],
    models.ProductLeaderboardScore: [
        "id",
        "run_id",
        "product_id",
        "score",
        "rank",
        "created_at",
    ],
    models.MonthlyLeaderboardNotification: ["id", "month", "created_at"],
    models.AnalyticsIngestionRun: [
        "id",
        "source",
        "job",
        "status",
        "window_start",
        "window_end",
        "started_at",
        "finished_at",
        "created_at",
    ],
    models.ProductTrafficDaily: _PRODUCT_TRAFFIC_FIELDS,
    models.ProductTrafficReferrerDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["referrer", "page_views"],
    models.ProductTrafficChannelDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["channel", "page_views"],
    models.ProductTrafficBrowserDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["browser", "page_views"],
    models.ProductTrafficOperatingSystemDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["operating_system", "page_views"],
    models.ProductTrafficDeviceDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["device", "page_views"],
    models.ProductTrafficCountryDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["country", "country_code", "page_views"],
    models.ProductTrafficCityDaily: _PRODUCT_TRAFFIC_FIELDS
    + ["city", "region", "country", "page_views"],
    models.SiteTrafficDaily: _SITE_TRAFFIC_FIELDS,
    models.SiteTrafficReferrerDaily: _SITE_TRAFFIC_FIELDS
    + ["referrer", "page_views"],
    models.SiteTrafficBrowserDaily: _SITE_TRAFFIC_FIELDS + ["browser", "page_views"],
    models.SiteTrafficOperatingSystemDaily: _SITE_TRAFFIC_FIELDS
    + ["operating_system", "page_views"],
    models.SiteTrafficDeviceDaily: _SITE_TRAFFIC_FIELDS + ["device", "page_views"],
    models.SiteTrafficCountryDaily: _SITE_TRAFFIC_FIELDS
    + ["country", "country_code", "page_views"],
    models.SiteTrafficRegionDaily: _SITE_TRAFFIC_FIELDS
    + ["region", "country", "country_code", "page_views"],
    models.SiteTrafficCityDaily: _SITE_TRAFFIC_FIELDS
    + ["city", "region", "country", "page_views"],
    models.PaymentConnector: [
        "id",
        "product_id",
        "provider",
        "status",
        "verified_at",
        "created_at",
    ],
    models.PaymentConnectorCredential: [
        "id",
        "connector_id",
        "status",
        "created_at",
    ],
    models.PaymentRevenueSnapshot: [
        "id",
        "connector_id",
        "currency_code",
        "period_start",
        "period_revenue_cents",
        "created_at",
    ],
    models.RewardRule: [
        "id",
        "key",
        "name",
        "category",
        "base_reward_amount",
        "is_active",
        "created_at",
    ],
    models.RewardCatalogItem: [
        "id",
        "feature_key",
        "name",
        "category",
        "base_cost",
        "is_active",
        "created_at",
    ],
    models.RewardTransaction: [
        "id",
        "user_id",
        "type",
        "reward_amount",
        "balance_after",
        "created_at",
    ],
    models.RewardBalance: [
        "user_id",
        "balance",
        "lifetime_earned",
        "lifetime_spent",
        "updated_at",
    ],
    models.Redemption: [
        "id",
        "user_id",
        "feature_key",
        "status",
        "cost",
        "starts_at",
        "created_at",
    ],
    models.FeatureEntitlement: [
        "id",
        "user_id",
        "feature_key",
        "status",
        "starts_at",
        "created_at",
    ],
    models.PlacementSchedule: [
        "id",
        "product_id",
        "feature_key",
        "slot_key",
        "status",
        "starts_at",
        "ends_at",
        "created_at",
    ],
    models.EventEnvelope: [
        "id",
        "event",
        "status",
        "queue",
        "attempts",
        "enqueued_at",
        "processed_at",
    ],
    models.EventAttempt: [
        "id",
        "envelope_id",
        "handler",
        "status",
        "duration_ms",
        "created_at",
    ],
}

_MODEL_VIEW_OPTIONS: dict[type[models.SQLModel], dict[str, str]] = {
    models.User: {"icon": "fa-solid fa-user"},
    models.MemberFeedback: {"icon": "fa-solid fa-comment"},
    models.Category: {"icon": "fa-solid fa-tag"},
    models.Plan: {"icon": "fa-solid fa-ticket"},
    models.PlanFeature: {"icon": "fa-solid fa-puzzle-piece"},
    models.PlanFeatureAssignment: {"icon": "fa-solid fa-sliders"},
    models.UserPlanPurchase: {"icon": "fa-solid fa-receipt"},
    models.Product: {"icon": "fa-solid fa-box"},
    models.ProductMetadata: {"icon": "fa-solid fa-file-lines"},
    models.ProductAnalytics: {"icon": "fa-solid fa-chart-line"},
    models.ProductMedia: {"icon": "fa-solid fa-image"},
    models.ProductVerification: {"icon": "fa-solid fa-shield"},
    models.ProductClaimAttempt: {"icon": "fa-solid fa-key"},
    models.ProductBadge: {"icon": "fa-solid fa-award"},
    models.ProductUpvote: {"icon": "fa-solid fa-thumbs-up"},
    models.AlternativeProduct: {"icon": "fa-solid fa-layer-group"},
    models.UseCase: {"icon": "fa-solid fa-lightbulb"},
    models.LeaderboardRun: {"icon": "fa-solid fa-trophy"},
    models.ProductLeaderboardScore: {"icon": "fa-solid fa-ranking-star"},
    models.MonthlyLeaderboardNotification: {"icon": "fa-solid fa-calendar"},
    models.AnalyticsIngestionRun: {"icon": "fa-solid fa-rotate"},
    models.PaymentConnector: {"icon": "fa-solid fa-credit-card"},
    models.PaymentConnectorCredential: {"icon": "fa-solid fa-key"},
    models.PaymentRevenueSnapshot: {"icon": "fa-solid fa-coins"},
    models.RewardRule: {"icon": "fa-solid fa-gift"},
    models.RewardCatalogItem: {"icon": "fa-solid fa-gift"},
    models.RewardTransaction: {"icon": "fa-solid fa-coins"},
    models.RewardBalance: {"icon": "fa-solid fa-wallet"},
    models.Redemption: {"icon": "fa-solid fa-ticket"},
    models.FeatureEntitlement: {"icon": "fa-solid fa-star"},
    models.PlacementSchedule: {"icon": "fa-solid fa-calendar-check"},
    models.EventEnvelope: {"icon": "fa-solid fa-envelope"},
    models.EventAttempt: {"icon": "fa-solid fa-bolt"},
}

_DEFAULT_SCHEDULED_JOBS = (
    "analytics_sync",
    "rewards_placements",
    "rewards_backlinks",
    "rewards_streak",
    "leaderboard_refresh",
)

_CLERK_SESSION_COOKIES = ("__session", "__clerk_session", "__clerk_jwt", "__clerk_db_jwt")


def _format_admin_label(user: models.User) -> str:
    if user.email:
        return user.email
    name = " ".join(part for part in (user.first_name, user.last_name) if part)
    return name or user.clerk_id


_SCHEDULED_JOB_HANDLERS = {
    "analytics_sync": rq_enqueue_analytics_sync,
    "rewards_placements": rq_enqueue_rewards_placements,
    "rewards_backlinks": rq_enqueue_rewards_backlinks,
    "rewards_streak": rq_enqueue_rewards_streak,
    "leaderboard_refresh": rq_enqueue_leaderboard_refresh,
}


@lru_cache
def _get_jwk_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def _order_fields(
    fields: list[BaseField],
    preferred_order: list[str],
) -> list[BaseField]:
    preferred_set = set(preferred_order)
    field_by_name = {field.name: field for field in fields}
    ordered = [field_by_name[name] for name in preferred_order if name in field_by_name]
    ordered.extend(field for field in fields if field.name not in preferred_set)
    return ordered


def _add_admin_redirect_routes(
    app: FastAPI,
    *,
    base_url: str,
    redirect_url: str,
) -> None:
    async def _redirect(_: Request) -> Response:
        return RedirectResponse(redirect_url, status_code=HTTP_303_SEE_OTHER)

    base = base_url.rstrip("/")
    if not base:
        base = "/"
    if base == "/":
        app.add_api_route("/", _redirect, include_in_schema=False)
        app.add_api_route("/{path:path}", _redirect, include_in_schema=False)
        return
    app.add_api_route(base, _redirect, include_in_schema=False)
    app.add_api_route(f"{base}/", _redirect, include_in_schema=False)
    app.add_api_route(f"{base}/{{path:path}}", _redirect, include_in_schema=False)


def _column_plan_for_model(
    model: type[models.SQLModel],
    column_names: list[str],
    relation_names: list[str],
) -> tuple[list[str], list[str]]:
    default_visible = _MODEL_LIST_FIELDS.get(model, column_names[:])
    default_visible = [
        name
        for name in default_visible
        if name in column_names and name != "updated_at"
    ]
    if "created_at" in column_names and "created_at" not in default_visible:
        default_visible.append("created_at")
    default_visible_relations = relation_names[:]
    timestamps = [name for name in ("created_at", "updated_at") if name in column_names]
    ordered = [name for name in default_visible if name not in timestamps]
    ordered.extend(name for name in default_visible_relations if name not in ordered)
    ordered.extend(
        name for name in column_names if name not in ordered and name not in timestamps
    )
    ordered.extend(name for name in relation_names if name not in ordered)
    ordered.extend(timestamps)
    hidden = [
        name
        for name in ordered
        if name not in default_visible and name not in default_visible_relations
    ]
    hidden.extend(
        name for name in _HEAVY_LIST_FIELDS if name in ordered and name not in hidden
    )
    return ordered, hidden


def _count_value(session: Session, statement) -> int:
    value = session.exec(statement).one()
    if isinstance(value, tuple):
        value = value[0]
    return int(value or 0)


def _coerce_date(value: object) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            try:
                return datetime.fromisoformat(value.replace("Z", "")).date()
            except ValueError:
                return datetime.now(timezone.utc).date()
    return datetime.now(timezone.utc).date()


def _fetch_daily_counts(
    session: Session,
    model: type[models.SQLModel],
    column,
    start: datetime,
    end: datetime,
    *,
    filters: list[object] | None = None,
) -> dict[date, int]:
    statement = (
        select(func.date(column), func.count())
        .select_from(model)
        .where(column >= start, column < end)
        .group_by(func.date(column))
    )
    if filters:
        statement = statement.where(*filters)
    results = session.exec(statement).all()
    daily: dict[date, int] = {}
    for raw_date, count in results:
        daily[_coerce_date(raw_date)] = int(count or 0)
    return daily


def _bucket_range(days: int) -> int:
    if days <= 7:
        return 1
    if days <= 30:
        return 7
    if days <= 90:
        return 14
    return 30


def _bucket_label(bucket_start: date, bucket_days: int) -> str:
    if bucket_days >= 28:
        return bucket_start.strftime("%b %Y")
    if bucket_days >= 7:
        return bucket_start.strftime("%m/%d")
    return bucket_start.strftime("%m/%d")


def _build_buckets(
    start: date, end: date, *, bucket_days: int
) -> list[dict[str, object]]:
    buckets: list[dict[str, object]] = []
    current = start
    end_exclusive = end + timedelta(days=1)
    while current < end_exclusive:
        bucket_end = min(current + timedelta(days=bucket_days), end_exclusive)
        buckets.append(
            {
                "start": current,
                "end": bucket_end,
                "label": _bucket_label(current, bucket_days),
            }
        )
        current = bucket_end
    return buckets


def _sum_daily_in_bucket(
    daily_counts: dict[date, int],
    bucket_start: date,
    bucket_end: date,
) -> int:
    total = 0
    current = bucket_start
    end_date = bucket_end
    while current < end_date:
        total += daily_counts.get(current, 0)
        current += timedelta(days=1)
    return total


def _format_duration(seconds: float | None) -> str:
    if seconds is None:
        return "0s"
    if seconds < 60:
        return f"{seconds:.1f}s"
    if seconds < 3600:
        return f"{seconds / 60:.1f}m"
    return f"{seconds / 3600:.1f}h"


def _percent_change(current: float, previous: float) -> float:
    if previous <= 0:
        return 100.0 if current > 0 else 0.0
    return ((current - previous) / previous) * 100


def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _normalize_enum_value(value: object) -> str:
    if hasattr(value, "value"):
        return str(getattr(value, "value"))
    return str(value)


def _format_timestamp(value: datetime | None) -> str | None:
    if not value:
        return None
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


class DashboardView(CustomView):
    async def render(self, request: Request, templates: Jinja2Templates) -> Response:
        now = datetime.now(timezone.utc)
        range_value = request.query_params.get("range", "30d")
        range_days = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365,
        }.get(range_value, 30)
        window_start = now - timedelta(days=range_days)
        prev_window_start = window_start - timedelta(days=range_days)
        window_label = f"Last {range_days} days"
        if range_value == "1y":
            window_label = "Last 12 months"
        bucket_days = _bucket_range(range_days)
        chart_start_date = now.date() - timedelta(days=range_days - 1)
        chart_end_date = now.date()
        chart_start = datetime.combine(chart_start_date, time.min, tzinfo=timezone.utc)
        chart_end = datetime.combine(
            chart_end_date + timedelta(days=1), time.min, tzinfo=timezone.utc
        )
        task_window_start = now - timedelta(hours=24)

        stats = {
            "users": 0,
            "products": 0,
            "products_published": 0,
            "products_archived": 0,
            "redemptions": 0,
            "redemptions_active": 0,
            "reward_transactions": 0,
            "reward_earn": 0,
            "reward_spend": 0,
            "payment_connectors": 0,
            "payment_connectors_active": 0,
            "payment_connectors_error": 0,
            "verified_products": 0,
        }
        users_in_window = 0
        users_prev_window = 0
        users_today = 0
        users_week = 0
        products_in_window = 0
        products_prev_window = 0
        products_today = 0
        products_week = 0
        redemptions_in_window = 0
        redemptions_prev_window = 0
        redemptions_today = 0
        redemptions_week = 0
        reward_in_window = 0
        reward_prev_window = 0
        total_users_before_window = 0
        total_products_before_window = 0
        published_before_window = 0
        verified_before_window = 0
        connectors_before_window = 0
        connectors_active_before_window = 0
        reward_before_window = 0

        user_daily: dict[date, int] = {}
        product_daily: dict[date, int] = {}
        product_archived_daily: dict[date, int] = {}
        base_users = 0
        base_products = 0
        daily_user_counts: dict[date, int] = {}
        daily_product_counts: dict[date, int] = {}
        activity_daily_by_type: dict[date, dict[str, int]] = {}
        task_metrics = {
            "total_processed": 0,
            "success_rate": 0.0,
            "avg_duration": _format_duration(0),
            "queued_now": 0,
            "failed": 0,
        }
        sync_metrics = {
            "total_runs": 0,
            "avg_items_per_run": 0.0,
            "total_items_synced": 0,
            "avg_duration": _format_duration(0),
            "success": 0,
            "failed": 0,
            "running": 0,
        }

        try:
            with Session(sync_engine) as session:
                stats["users"] = _count_value(
                    session, select(func.count()).select_from(models.User)
                )
                stats["products"] = _count_value(
                    session, select(func.count()).select_from(models.Product)
                )
                stats["products_published"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.status == models.ProductStatus.PUBLISHED),
                )
                stats["products_archived"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.status == models.ProductStatus.ARCHIVED),
                )
                stats["redemptions"] = _count_value(
                    session, select(func.count()).select_from(models.Redemption)
                )
                stats["redemptions_active"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Redemption)
                    .where(models.Redemption.status == models.RedemptionStatus.ACTIVE),
                )
                stats["reward_transactions"] = _count_value(
                    session, select(func.count()).select_from(models.RewardTransaction)
                )
                stats["reward_earn"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.RewardTransaction)
                    .where(models.RewardTransaction.type == models.RewardTransactionType.EARN),
                )
                stats["reward_spend"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.RewardTransaction)
                    .where(models.RewardTransaction.type == models.RewardTransactionType.SPEND),
                )
                stats["payment_connectors"] = _count_value(
                    session, select(func.count()).select_from(models.PaymentConnector)
                )
                stats["payment_connectors_active"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.PaymentConnector)
                    .where(
                        models.PaymentConnector.status
                        == models.PaymentConnectorStatus.ACTIVE
                    ),
                )
                stats["payment_connectors_error"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.PaymentConnector)
                    .where(
                        models.PaymentConnector.status
                        == models.PaymentConnectorStatus.ERROR
                    ),
                )
                stats["verified_products"] = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.ProductVerification)
                    .where(models.ProductVerification.is_verified.is_(True)),
                )

                users_in_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at >= window_start),
                )
                users_prev_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(
                        models.User.created_at >= prev_window_start,
                        models.User.created_at < window_start,
                    ),
                )
                today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
                week_start = now - timedelta(days=7)
                users_today = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at >= today_start),
                )
                users_week = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at >= week_start),
                )

                products_in_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.created_at >= window_start),
                )
                products_prev_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(
                        models.Product.created_at >= prev_window_start,
                        models.Product.created_at < window_start,
                    ),
                )
                products_today = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.created_at >= today_start),
                )
                products_week = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.created_at >= week_start),
                )

                redemptions_in_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Redemption)
                    .where(models.Redemption.created_at >= window_start),
                )
                redemptions_prev_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Redemption)
                    .where(
                        models.Redemption.created_at >= prev_window_start,
                        models.Redemption.created_at < window_start,
                    ),
                )
                redemptions_today = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Redemption)
                    .where(models.Redemption.created_at >= today_start),
                )
                redemptions_week = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Redemption)
                    .where(models.Redemption.created_at >= week_start),
                )

                reward_in_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.RewardTransaction)
                    .where(models.RewardTransaction.created_at >= window_start),
                )
                reward_prev_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.RewardTransaction)
                    .where(
                        models.RewardTransaction.created_at >= prev_window_start,
                        models.RewardTransaction.created_at < window_start,
                    ),
                )

                total_users_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at < window_start),
                )
                total_products_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.created_at < window_start),
                )
                published_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(
                        models.Product.status == models.ProductStatus.PUBLISHED,
                        models.Product.created_at < window_start,
                    ),
                )
                verified_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.ProductVerification)
                    .where(
                        models.ProductVerification.is_verified.is_(True),
                        models.ProductVerification.created_at < window_start,
                    ),
                )
                connectors_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.PaymentConnector)
                    .where(models.PaymentConnector.created_at < window_start),
                )
                connectors_active_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.PaymentConnector)
                    .where(
                        models.PaymentConnector.status
                        == models.PaymentConnectorStatus.ACTIVE,
                        models.PaymentConnector.created_at < window_start,
                    ),
                )
                reward_before_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.RewardTransaction)
                    .where(models.RewardTransaction.created_at < window_start),
                )

                user_daily = _fetch_daily_counts(
                    session,
                    models.User,
                    models.User.created_at,
                    chart_start,
                    chart_end,
                )
                base_users = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at < chart_start),
                )
                product_daily = _fetch_daily_counts(
                    session,
                    models.Product,
                    models.Product.created_at,
                    chart_start,
                    chart_end,
                )
                base_products = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Product)
                    .where(models.Product.created_at < chart_start),
                )
                product_archived_daily = _fetch_daily_counts(
                    session,
                    models.Product,
                    models.Product.updated_at,
                    chart_start,
                    chart_end,
                    filters=[models.Product.status == models.ProductStatus.ARCHIVED],
                )

                recent_start = now.date() - timedelta(days=6)
                recent_start_dt = datetime.combine(
                    recent_start, time.min, tzinfo=timezone.utc
                )
                recent_end_dt = datetime.combine(
                    now.date() + timedelta(days=1), time.min, tzinfo=timezone.utc
                )
                daily_user_counts = _fetch_daily_counts(
                    session,
                    models.User,
                    models.User.created_at,
                    recent_start_dt,
                    recent_end_dt,
                )
                daily_product_counts = _fetch_daily_counts(
                    session,
                    models.Product,
                    models.Product.created_at,
                    recent_start_dt,
                    recent_end_dt,
                )

                activity_rows = session.exec(
                    select(
                        func.date(models.RewardTransaction.created_at),
                        models.RewardTransaction.type,
                        func.count(),
                    )
                    .where(
                        models.RewardTransaction.created_at >= chart_start,
                        models.RewardTransaction.created_at < chart_end,
                    )
                    .group_by(
                        func.date(models.RewardTransaction.created_at),
                        models.RewardTransaction.type,
                    )
                ).all()
                type_map = {
                    "earn": "earn",
                    "spend": "spend",
                    "adjustment": "adjustments",
                    "refund": "adjustments",
                }
                for raw_date, transaction_type, count in activity_rows:
                    bucket_date = _coerce_date(raw_date)
                    normalized = _normalize_enum_value(transaction_type)
                    category = type_map.get(normalized)
                    if not category:
                        continue
                    activity_daily_by_type.setdefault(
                        bucket_date,
                        {"earn": 0, "spend": 0, "adjustments": 0},
                    )[category] += int(count or 0)

                completed_events = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.EventEnvelope)
                    .where(
                        models.EventEnvelope.status
                        == models.EventEnvelopeStatus.COMPLETED,
                        models.EventEnvelope.processed_at >= task_window_start,
                    ),
                )
                failed_events = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.EventEnvelope)
                    .where(
                        models.EventEnvelope.status
                        == models.EventEnvelopeStatus.DEAD_LETTER,
                        models.EventEnvelope.updated_at >= task_window_start,
                    ),
                )
                queued_events = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.EventEnvelope)
                    .where(
                        models.EventEnvelope.status.in_(
                            [
                                models.EventEnvelopeStatus.PENDING,
                                models.EventEnvelopeStatus.RETRYING,
                                models.EventEnvelopeStatus.PROCESSING,
                            ]
                        )
                    ),
                )
                avg_attempt_duration = session.exec(
                    select(func.avg(models.EventAttempt.duration_ms)).where(
                        models.EventAttempt.created_at >= task_window_start
                    )
                ).one()
                avg_duration_seconds = 0.0
                if isinstance(avg_attempt_duration, tuple):
                    avg_attempt_duration = avg_attempt_duration[0]
                if avg_attempt_duration:
                    avg_duration_seconds = float(avg_attempt_duration) / 1000
                task_metrics = {
                    "total_processed": completed_events,
                    "success_rate": _safe_ratio(
                        completed_events, completed_events + failed_events
                    )
                    * 100,
                    "avg_duration": _format_duration(avg_duration_seconds),
                    "queued_now": queued_events,
                    "failed": failed_events,
                }

                recent_runs = session.exec(
                    select(models.AnalyticsIngestionRun).where(
                        models.AnalyticsIngestionRun.started_at >= task_window_start
                    )
                ).all()
                run_total = len(recent_runs)
                run_success = sum(
                    1
                    for run in recent_runs
                    if run.status == models.AnalyticsIngestionStatus.COMPLETED
                )
                run_failed = sum(
                    1
                    for run in recent_runs
                    if run.status == models.AnalyticsIngestionStatus.FAILED
                )
                run_running = sum(
                    1
                    for run in recent_runs
                    if run.status == models.AnalyticsIngestionStatus.PROCESSING
                )
                run_durations = [
                    (run.finished_at - run.started_at).total_seconds()
                    for run in recent_runs
                    if run.finished_at and run.started_at
                ]
                avg_run_duration = (
                    sum(run_durations) / len(run_durations) if run_durations else 0
                )
                product_rows = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.ProductTrafficDaily)
                    .where(models.ProductTrafficDaily.created_at >= task_window_start),
                )
                site_rows = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.SiteTrafficDaily)
                    .where(models.SiteTrafficDaily.created_at >= task_window_start),
                )
                total_items = product_rows + site_rows
                sync_metrics = {
                    "total_runs": run_total,
                    "avg_items_per_run": _safe_ratio(total_items, run_total),
                    "total_items_synced": total_items,
                    "avg_duration": _format_duration(avg_run_duration),
                    "success": run_success,
                    "failed": run_failed,
                    "running": run_running,
                }
        except Exception:
            logger.warning("Admin dashboard query failed; using defaults.", exc_info=True)

        buckets = _build_buckets(
            chart_start_date, chart_end_date, bucket_days=bucket_days
        )

        user_signups: list[dict[str, object]] = []
        cumulative_users = base_users
        for bucket in buckets:
            signups = _sum_daily_in_bucket(user_daily, bucket["start"], bucket["end"])
            cumulative_users += signups
            user_signups.append(
                {
                    "label": bucket["label"],
                    "signups": signups,
                    "cumulative": cumulative_users,
                }
            )

        product_growth = []
        cumulative_products = base_products
        for bucket in buckets:
            added = _sum_daily_in_bucket(
                product_daily, bucket["start"], bucket["end"]
            )
            archived = _sum_daily_in_bucket(
                product_archived_daily, bucket["start"], bucket["end"]
            )
            net = added - archived
            cumulative_products += net
            product_growth.append(
                {
                    "label": bucket["label"],
                    "added": added,
                    "archived": archived,
                    "net": net,
                    "cumulative": cumulative_products,
                }
            )

        reward_activity = []
        for bucket in buckets:
            earn = 0
            spend = 0
            adjustments = 0
            current_date = bucket["start"]
            end_date = bucket["end"]
            while current_date < end_date:
                counts = activity_daily_by_type.get(current_date, {})
                earn += counts.get("earn", 0)
                spend += counts.get("spend", 0)
                adjustments += counts.get("adjustments", 0)
                current_date += timedelta(days=1)
            reward_activity.append(
                {
                    "label": bucket["label"],
                    "earn": earn,
                    "spend": spend,
                    "adjustments": adjustments,
                    "total": earn + spend + adjustments,
                }
            )

        daily_stats: list[dict[str, object]] = []
        recent_start = now.date() - timedelta(days=6)
        for offset in range(7):
            day = recent_start + timedelta(days=offset)
            daily_stats.append(
                {
                    "label": day.strftime("%m/%d"),
                    "users": int(daily_user_counts.get(day, 0)),
                    "products": int(daily_product_counts.get(day, 0)),
                }
            )

        growth_metrics = [
            {
                "label": "Total Users",
                "total": stats["users"],
                "delta": users_in_window,
                "percent_change": _percent_change(users_in_window, users_prev_window),
                "subtitle": f"in {window_label.lower()}",
                "detail": f"{users_today} today, {users_week} last 7d",
                "icon": "fa-solid fa-users",
            },
            {
                "label": "Products",
                "total": stats["products"],
                "delta": products_in_window,
                "percent_change": _percent_change(
                    products_in_window, products_prev_window
                ),
                "subtitle": f"in {window_label.lower()}",
                "detail": (
                    f"{stats['products_published']} published, "
                    f"{stats['products_archived']} archived"
                ),
                "icon": "fa-solid fa-box",
            },
            {
                "label": "Redemptions",
                "total": stats["redemptions"],
                "delta": redemptions_in_window,
                "percent_change": _percent_change(
                    redemptions_in_window, redemptions_prev_window
                ),
                "subtitle": f"in {window_label.lower()}",
                "detail": (
                    f"{stats['redemptions_active']} active, "
                    f"{redemptions_today} today"
                ),
                "icon": "fa-solid fa-ticket",
            },
            {
                "label": "Reward transactions",
                "total": stats["reward_transactions"],
                "delta": reward_in_window,
                "percent_change": _percent_change(reward_in_window, reward_prev_window),
                "subtitle": f"in {window_label.lower()}",
                "detail": (
                    f"{stats['reward_earn']} earn, "
                    f"{stats['reward_spend']} spend"
                ),
                "icon": "fa-solid fa-coins",
            },
        ]

        system_metrics = [
            {
                "metric": "Published product rate",
                "current": _safe_ratio(
                    stats["products_published"], stats["products"]
                )
                * 100,
                "previous": _safe_ratio(
                    published_before_window, total_products_before_window
                )
                * 100,
                "change": _percent_change(
                    _safe_ratio(stats["products_published"], stats["products"]) * 100,
                    _safe_ratio(
                        published_before_window, total_products_before_window
                    )
                    * 100,
                ),
                "precision": 1,
                "unit": "%",
            },
            {
                "metric": "Verified product rate",
                "current": _safe_ratio(
                    stats["verified_products"], stats["products"]
                )
                * 100,
                "previous": _safe_ratio(
                    verified_before_window, total_products_before_window
                )
                * 100,
                "change": _percent_change(
                    _safe_ratio(stats["verified_products"], stats["products"]) * 100,
                    _safe_ratio(
                        verified_before_window, total_products_before_window
                    )
                    * 100,
                ),
                "precision": 1,
                "unit": "%",
            },
            {
                "metric": "Active connector rate",
                "current": _safe_ratio(
                    stats["payment_connectors_active"],
                    stats["payment_connectors"],
                )
                * 100,
                "previous": _safe_ratio(
                    connectors_active_before_window, connectors_before_window
                )
                * 100,
                "change": _percent_change(
                    _safe_ratio(
                        stats["payment_connectors_active"],
                        stats["payment_connectors"],
                    )
                    * 100,
                    _safe_ratio(
                        connectors_active_before_window, connectors_before_window
                    )
                    * 100,
                ),
                "precision": 1,
                "unit": "%",
            },
            {
                "metric": "Rewards per user",
                "current": _safe_ratio(stats["reward_transactions"], stats["users"]),
                "previous": _safe_ratio(reward_before_window, total_users_before_window),
                "change": _percent_change(
                    _safe_ratio(stats["reward_transactions"], stats["users"]),
                    _safe_ratio(reward_before_window, total_users_before_window),
                ),
                "precision": 2,
                "unit": "",
            },
        ]

        dashboard_data = {
            "userSignups": user_signups,
            "productGrowth": product_growth,
            "rewardActivity": reward_activity,
            "dailyStats": daily_stats,
        }

        return templates.TemplateResponse(
            request=request,
            name=self.template_path,
            context={
                "title": self.title(request),
                "stats": stats,
                "growth_metrics": growth_metrics,
                "system_metrics": system_metrics,
                "task_metrics": task_metrics,
                "sync_metrics": sync_metrics,
                "user_signups": user_signups,
                "product_growth": product_growth,
                "reward_activity": reward_activity,
                "daily_stats": daily_stats,
                "range_value": range_value,
                "range_label": window_label,
                "dashboard_data": dashboard_data,
                "window_label": window_label,
                "updated_at": _format_timestamp(now),
            },
        )


class SlimModelView(ModelView):
    list_template = "admin_list.html"

    def __init__(self, model: type[models.SQLModel], **kwargs: object) -> None:
        mapper = inspect(model)
        column_names = [
            attr.key for attr in mapper.attrs if isinstance(attr, ColumnProperty)
        ]
        relation_names = [
            rel.key for rel in mapper.relationships.values() if not rel.uselist
        ]
        relationship_fields = sorted(rel.key for rel in mapper.relationships.values())
        ordered_columns, hidden_columns = _column_plan_for_model(
            model, column_names, relation_names
        )
        collection_relationship_fields = sorted(
            rel.key for rel in mapper.relationships.values() if rel.uselist
        )
        self.exclude_fields_from_list = collection_relationship_fields
        self.export_types = []
        self._hidden_columns = sorted(set(hidden_columns))
        self.exclude_fields_from_detail = collection_relationship_fields
        self.exclude_fields_from_create = relationship_fields
        self.exclude_fields_from_edit = sorted(
            set(relationship_fields).union(_READONLY_EDIT_FIELDS)
        )
        super().__init__(model, **kwargs)
        self.fields = _order_fields(self.fields, ordered_columns)

    async def _configs(self, request: Request) -> dict[str, object]:
        config = await super()._configs(request)
        config["hiddenColumns"] = self._hidden_columns
        return config

    async def repr(self, obj: object, request: Request) -> str:
        return str(obj)


class AdminAuthProvider(AuthProvider):
    def _get_clerk_token(self, request: Request) -> str | None:
        auth_header = request.headers.get("authorization")
        if auth_header:
            scheme, _, value = auth_header.partition(" ")
            if scheme.lower() == "bearer" and value:
                return value.strip()
        for cookie_name in _CLERK_SESSION_COOKIES:
            token = request.cookies.get(cookie_name)
            if token:
                return token
        return None

    def _decode_clerk_token(self, token: str) -> dict[str, object] | None:
        settings = get_settings()
        if not settings.clerk_jwks_url:
            return None
        try:
            jwk_client = _get_jwk_client(settings.clerk_jwks_url)
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={
                    "verify_aud": False,
                    "verify_iat": settings.clerk_verify_iat,
                },
                leeway=settings.clerk_leeway,
            )
        except jwt.PyJWTError:
            return None

    def _get_clerk_user_from_token(self, token: str | None) -> models.User | None:
        if not token:
            return None
        payload = self._decode_clerk_token(token)
        if not payload:
            return None
        clerk_id = payload.get("sub")
        if not isinstance(clerk_id, str) or not clerk_id:
            return None
        try:
            with Session(sync_engine) as session:
                statement = select(models.User).where(models.User.clerk_id == clerk_id)
                return session.exec(statement).first()
        except Exception:
            logger.warning("Failed to load admin user from token.", exc_info=True)
            return None

    def _get_clerk_user(self, request: Request) -> models.User | None:
        token = self._get_clerk_token(request)
        return self._get_clerk_user_from_token(token)

    def _parse_session_user_id(self, session_value: object) -> int | None:
        if isinstance(session_value, int):
            return session_value
        if isinstance(session_value, str) and session_value.isdigit():
            return int(session_value)
        return None

    def _load_session_user(self, request: Request) -> models.User | None:
        session_user_id = self._parse_session_user_id(
            request.session.get("admin_user_id")
        )
        if session_user_id is None:
            return None
        try:
            with Session(sync_engine) as session:
                statement = select(models.User).where(models.User.id == session_user_id)
                return session.exec(statement).first()
        except Exception:
            logger.warning("Failed to load admin user from session.", exc_info=True)
            return None

    async def login(
        self,
        username: str | None,
        password: str | None,
        remember_me: bool,
        request: Request,
        response: Response,
    ) -> Response:
        clerk_user = self._get_clerk_user(request)
        if clerk_user and clerk_user.role == models.UserRole.ADMIN:
            label = _format_admin_label(clerk_user)
            request.session.update(
                {"admin_user_id": clerk_user.id, "admin_user_label": label}
            )
            return response
        raise LoginFailed("Invalid username or password.")

    async def logout(self, request: Request, response: Response) -> Response:
        request.session.clear()
        settings = get_settings()
        redirect_url = settings.admin_base_url
        if settings.clerk_publishable_key:
            html = f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\"/>
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>
    <title>Signing out</title>
  </head>
  <body>
    <p>Signing out...</p>
    <script async crossorigin=\"anonymous\"
            data-clerk-publishable-key=\"{settings.clerk_publishable_key}\"
            src=\"{settings.clerk_js_url}\"></script>
    <script>
      window.addEventListener(\"load\", function () {{
        if (!window.Clerk) {{
          window.location.href = \"{redirect_url}\";
          return;
        }}
        Clerk.load()
          .then(function () {{
            return Clerk.signOut({{ redirectUrl: \"{redirect_url}\" }});
          }})
          .catch(function () {{
            window.location.href = \"{redirect_url}\";
          }});
      }});
            </script>
  </body>
</html>"""
            response = HTMLResponse(html)
        else:
            response = RedirectResponse(redirect_url, status_code=HTTP_303_SEE_OTHER)
        response.delete_cookie("admin_session", path="/")
        response.delete_cookie("admin_session", path=settings.admin_base_url or "/")
        for cookie_name in _CLERK_SESSION_COOKIES:
            response.delete_cookie(cookie_name, path="/")
        return response

    async def is_authenticated(self, request: Request) -> bool:
        user = self._load_session_user(request)
        if user and user.role == models.UserRole.ADMIN:
            return True
        clerk_user = self._get_clerk_user(request)
        if clerk_user and clerk_user.role == models.UserRole.ADMIN:
            return True
        return False

    def get_admin_user(self, request: Request) -> AdminUser | None:
        user = self._load_session_user(request)
        if user and user.role == models.UserRole.ADMIN:
            return AdminUser(username=str(user))
        clerk_user = self._get_clerk_user(request)
        if clerk_user and clerk_user.role == models.UserRole.ADMIN:
            return AdminUser(username=str(clerk_user))
        return None


async def _admin_trigger_scheduled_jobs(request: Request) -> Response:
    payload: dict[str, object] = {}
    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            payload = {}
    except Exception:
        payload = {}

    raw_jobs = payload.get("jobs") if payload else None
    if raw_jobs is None and payload:
        raw_jobs = payload.get("job")

    if raw_jobs is None:
        requested_jobs = list(_DEFAULT_SCHEDULED_JOBS)
    elif isinstance(raw_jobs, str):
        requested_jobs = [raw_jobs]
    elif isinstance(raw_jobs, list) and all(isinstance(item, str) for item in raw_jobs):
        requested_jobs = raw_jobs
    else:
        return JSONResponse(
            status_code=HTTP_400_BAD_REQUEST,
            content={
                "ok": False,
                "error": {"message": "Invalid jobs payload."},
            },
        )

    normalized: list[str] = []
    seen: set[str] = set()
    for job in requested_jobs:
        normalized_job = job.strip().lower()
        if not normalized_job:
            continue
        if normalized_job == "all":
            normalized = list(_DEFAULT_SCHEDULED_JOBS)
            seen = set(normalized)
            break
        if normalized_job not in seen:
            normalized.append(normalized_job)
            seen.add(normalized_job)

    if not normalized:
        return JSONResponse(
            status_code=HTTP_400_BAD_REQUEST,
            content={
                "ok": False,
                "error": {"message": "No valid jobs specified."},
            },
        )

    invalid = [job for job in normalized if job not in _SCHEDULED_JOB_HANDLERS]
    if invalid:
        return JSONResponse(
            status_code=HTTP_400_BAD_REQUEST,
            content={
                "ok": False,
                "error": {
                    "message": "Unknown scheduled jobs.",
                    "jobs": invalid,
                },
            },
        )

    background = BackgroundTasks()
    for job in normalized:
        background.add_task(_SCHEDULED_JOB_HANDLERS[job])

    message = "Scheduled jobs: " + ", ".join(normalized)
    return JSONResponse(
        content={"ok": True, "scheduled": normalized, "message": message},
        background=background,
    )


def configure_admin(app: FastAPI) -> None:
    settings = get_settings()
    admin_enabled = bool(
        settings.clerk_jwks_url
        and settings.clerk_js_url
        and settings.clerk_publishable_key
        and settings.clerk_secret_key
    )
    if not admin_enabled:
        if settings.admin_redirect_url:
            _add_admin_redirect_routes(
                app,
                base_url=settings.admin_base_url,
                redirect_url=settings.admin_redirect_url,
            )
            logger.info("Admin is disabled; redirect enabled.")
        else:
            logger.info("Admin is disabled; skipping admin setup.")
        return

    session_secret = settings.clerk_secret_key
    base_dir = Path(__file__).resolve().parent
    dashboard_view = DashboardView(
        label="Dashboard",
        icon="fa-solid fa-house",
        path="/",
        template_path="dashboard.html",
        name="dashboard",
        add_to_menu=True,
    )
    admin = Admin(
        sync_engine,
        title=settings.admin_title,
        base_url=settings.admin_base_url,
        auth_provider=AdminAuthProvider(),
        statics_dir=str(base_dir / "admin_statics"),
        templates_dir=str(base_dir / "admin_templates"),
        index_view=dashboard_view,
        middlewares=[
            Middleware(
                SessionMiddleware,
                secret_key=session_secret,
                session_cookie="admin_session",
            )
        ],
    )

    list_js_path = base_dir / "admin_statics" / "js" / "list.js"

    def list_js_version() -> int:
        try:
            return int(list_js_path.stat().st_mtime)
        except FileNotFoundError:
            return 1

    admin.templates.env.globals["list_js_version"] = list_js_version
    admin.templates.env.globals["admin_sso_exchange_url"] = (
        settings.admin_base_url.rstrip("/") + "/sso"
    )
    admin.templates.env.globals["admin_base_url"] = settings.admin_base_url
    admin.templates.env.globals["clerk_publishable_key"] = settings.clerk_publishable_key
    admin.templates.env.globals["clerk_js_url"] = settings.clerk_js_url
    admin.templates.env.globals["admin_enabled"] = admin_enabled

    admin.routes.append(
        Route(
            "/scheduler/run",
            _admin_trigger_scheduled_jobs,
            methods=["POST"],
            name="scheduler-run",
        )
    )
    admin.routes.append(
        Route(
            "/sso",
            _admin_sso_login,
            methods=["GET", "POST"],
            name="sso-login",
        )
    )

    def build_model_view(model: type[models.SQLModel]) -> SlimModelView:
        return SlimModelView(model, **_MODEL_VIEW_OPTIONS.get(model, {}))

    def build_views(*model_list: type[models.SQLModel]) -> list[SlimModelView]:
        return [build_model_view(model) for model in model_list]

    account_views = build_views(
        models.User,
        models.MemberFeedback,
    )
    catalog_views = build_views(
        models.Category,
        models.Plan,
        models.PlanFeature,
        models.PlanFeatureAssignment,
        models.UseCase,
        models.AlternativeProduct,
    )
    product_views = build_views(
        models.Product,
        models.ProductMetadata,
        models.ProductMedia,
        models.ProductVerification,
        models.ProductClaimAttempt,
        models.ProductBadge,
        models.ProductUpvote,
    )
    reward_views = build_views(
        models.RewardRule,
        models.RewardCatalogItem,
        models.RewardBalance,
        models.RewardTransaction,
        models.Redemption,
        models.FeatureEntitlement,
        models.PlacementSchedule,
    )
    payment_views = build_views(
        models.UserPlanPurchase,
        models.PaymentConnector,
        models.PaymentConnectorCredential,
        models.PaymentRevenueSnapshot,
    )
    analytics_views = build_views(
        models.ProductAnalytics,
        models.AnalyticsIngestionRun,
        models.ProductTrafficDaily,
        models.ProductTrafficReferrerDaily,
        models.ProductTrafficChannelDaily,
        models.ProductTrafficBrowserDaily,
        models.ProductTrafficOperatingSystemDaily,
        models.ProductTrafficDeviceDaily,
        models.ProductTrafficCountryDaily,
        models.ProductTrafficCityDaily,
        models.SiteTrafficDaily,
        models.SiteTrafficReferrerDaily,
        models.SiteTrafficBrowserDaily,
        models.SiteTrafficOperatingSystemDaily,
        models.SiteTrafficDeviceDaily,
        models.SiteTrafficCountryDaily,
        models.SiteTrafficRegionDaily,
        models.SiteTrafficCityDaily,
    )
    leaderboard_views = build_views(
        models.LeaderboardRun,
        models.ProductLeaderboardScore,
        models.MonthlyLeaderboardNotification,
    )
    event_views = build_views(
        models.EventEnvelope,
        models.EventAttempt,
    )

    scheduler_view = CustomView(
        label="Scheduler",
        icon="fa-solid fa-bolt",
        path="/scheduler",
        template_path="scheduler.html",
        name="scheduler",
    )
    docs_view = Link(label="API Docs", icon="fa-solid fa-book", url="/docs", target="_self")

    admin.add_view(
        DropDown(
            "Accounts",
            icon="fa-solid fa-users",
            views=account_views,
        )
    )
    admin.add_view(
        DropDown(
            "Catalog",
            icon="fa-solid fa-tags",
            views=catalog_views,
        )
    )
    admin.add_view(
        DropDown(
            "Products",
            icon="fa-solid fa-box",
            views=product_views,
        )
    )
    admin.add_view(
        DropDown(
            "Rewards",
            icon="fa-solid fa-gift",
            views=reward_views,
        )
    )
    admin.add_view(
        DropDown(
            "Payments",
            icon="fa-solid fa-credit-card",
            views=payment_views,
        )
    )
    admin.add_view(
        DropDown(
            "Analytics",
            icon="fa-solid fa-chart-line",
            views=analytics_views,
        )
    )
    admin.add_view(
        DropDown(
            "Leaderboards",
            icon="fa-solid fa-trophy",
            views=leaderboard_views,
        )
    )
    admin.add_view(
        DropDown(
            "Events",
            icon="fa-solid fa-envelope",
            views=event_views,
        )
    )
    admin.add_view(
        DropDown(
            "Operations",
            icon="fa-solid fa-gears",
            views=[scheduler_view],
        )
    )
    admin.add_view(docs_view)

    admin.mount_to(app)


@login_not_required
async def _admin_sso_login(request: Request) -> Response:
    settings = get_settings()

    def _error(message: str) -> Response:
        content: dict[str, object] = {"ok": False, "error": {"message": message}}
        if settings.admin_redirect_url:
            content["redirectUrl"] = settings.admin_redirect_url
        return JSONResponse(status_code=HTTP_403_FORBIDDEN, content=content)

    if not settings.clerk_jwks_url:
        return _error("CLERK_JWKS_URL is not configured.")
    token = request.query_params.get("token")
    if not token and request.method == "POST":
        try:
            payload = await request.json()
            if isinstance(payload, dict):
                token = payload.get("token") or payload.get("jwt")
        except Exception:
            token = None
    provider = AdminAuthProvider()
    if not token:
        return _error("Missing SSO token.")
    payload = provider._decode_clerk_token(token)
    if not payload:
        return _error("Invalid SSO token.")
    clerk_id = payload.get("sub")
    if not isinstance(clerk_id, str) or not clerk_id:
        return _error("Invalid SSO subject.")
    try:
        with Session(sync_engine) as session:
            statement = select(models.User).where(models.User.clerk_id == clerk_id)
            user = session.exec(statement).first()
    except Exception:
        logger.warning("Admin SSO lookup failed.", exc_info=True)
        return _error("User lookup failed.")
    if not user:
        return _error("User not found.")
    if user.role != models.UserRole.ADMIN:
        return _error("User is not an admin.")
    label = _format_admin_label(user)
    request.session.update({"admin_user_id": user.id, "admin_user_label": label})

    redirect_to = request.query_params.get("redirect")
    if not redirect_to or "://" in redirect_to or redirect_to.startswith("//"):
        redirect_to = settings.admin_base_url
    return RedirectResponse(redirect_to, status_code=303)
