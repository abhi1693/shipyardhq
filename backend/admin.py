from __future__ import annotations

from functools import lru_cache
from datetime import date, datetime, time, timedelta, timezone
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

import models
from database import sync_engine
from settings import get_settings
from services.logger import AppLogger
from services.sync_scheduler import (
    enqueue_sync_jobs,
    run_daily_leaderboard_refresh,
    run_monthly_leaderboard_refresh,
    run_task_worker,
    run_weekly_leaderboard_refresh,
)

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

_MODEL_LIST_FIELDS: dict[type[models.SQLModel], list[str]] = {
    models.User: ["id", "handle", "display_name", "clerk_id", "role"],
    models.ProviderAccount: [
        "id",
        "user_id",
        "provider",
        "provider_username",
        "provider_user_id",
        "status",
        "last_synced_at",
    ],
    models.UserSettings: [
        "id",
        "user_id",
        "profile_public",
        "include_in_leaderboard",
        "show_repos",
        "show_commits",
        "country",
    ],
    models.ProviderInstallation: [
        "id",
        "user_id",
        "provider",
        "installation_id",
        "account_login",
        "account_type",
        "last_synced_at",
    ],
    models.Repository: [
        "id",
        "full_name",
        "provider",
        "owner_login",
        "primary_language",
        "is_private",
        "archived",
        "default_branch",
    ],
    models.RepoSyncCursor: [
        "id",
        "user_id",
        "provider",
        "repository_id",
        "cursor_key",
        "cursor_value",
    ],
    models.ActivityItem: [
        "id",
        "user_id",
        "provider",
        "type",
        "occurred_at",
        "repo_full_name",
        "title",
        "number",
        "url",
    ],
    models.SyncRun: [
        "id",
        "user_id",
        "provider",
        "status",
        "started_at",
        "finished_at",
        "repos",
        "items",
        "facts",
        "warnings",
        "error",
    ],
    models.Task: [
        "id",
        "task_type",
        "status",
        "user_id",
        "priority",
        "run_after",
        "locked_until",
        "attempts",
        "max_attempts",
        "started_at",
        "finished_at",
        "error",
    ],
    models.ActivityFactDaily: [
        "id",
        "user_id",
        "provider",
        "day",
        "metric_key",
        "value",
        "bucket",
    ],
    models.ScoreSnapshot: [
        "id",
        "user_id",
        "period",
        "period_start",
        "period_end",
        "total_score",
        "consistency_score",
        "momentum_score",
        "impact_score",
        "scoring_version",
        "computed_at",
    ],
    models.LeaderboardEntryRecord: [
        "id",
        "user_id",
        "period",
        "period_start",
        "period_end",
        "scope",
        "total_score",
        "rank",
        "score_snapshot_id",
        "computed_at",
    ],
}

_MODEL_VIEW_OPTIONS: dict[type[models.SQLModel], dict[str, str]] = {
    models.User: {"icon": "fa-solid fa-user"},
    models.ProviderAccount: {"icon": "fa-solid fa-link"},
    models.UserSettings: {"label": "User Settings", "icon": "fa-solid fa-gear"},
    models.ProviderInstallation: {"icon": "fa-solid fa-plug"},
    models.Repository: {"label": "Repositories", "icon": "fa-solid fa-code-branch"},
    models.RepoSyncCursor: {"icon": "fa-solid fa-rotate"},
    models.ActivityItem: {"icon": "fa-solid fa-bolt"},
    models.SyncRun: {"icon": "fa-solid fa-clock"},
    models.Task: {"icon": "fa-solid fa-list-check"},
    models.ActivityFactDaily: {
        "label": "Activity Fact Daily",
        "icon": "fa-solid fa-chart-bar",
    },
    models.ScoreSnapshot: {"icon": "fa-solid fa-chart-line"},
    models.LeaderboardEntryRecord: {"icon": "fa-solid fa-trophy"},
}

_SCHEDULED_JOB_HANDLERS = {
    "sync_fanout": enqueue_sync_jobs,
    "leaderboard_daily": run_daily_leaderboard_refresh,
    "leaderboard_weekly": run_weekly_leaderboard_refresh,
    "leaderboard_monthly": run_monthly_leaderboard_refresh,
}
_DEFAULT_SCHEDULED_JOBS = (
    "sync_fanout",
    "task_worker",
    "leaderboard_daily",
    "leaderboard_weekly",
    "leaderboard_monthly",
)

_CLERK_SESSION_COOKIES = ("__session", "__clerk_session", "__clerk_jwt", "__clerk_db_jwt")


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


def _percent_change(current: int, previous: int) -> float:
    if previous <= 0:
        return 100.0 if current > 0 else 0.0
    return ((current - previous) / previous) * 100


def _safe_ratio(numerator: int, denominator: int) -> float:
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
        chart_start_date = (now.date() - timedelta(days=range_days - 1))
        chart_end_date = now.date()
        chart_start = datetime.combine(chart_start_date, time.min, tzinfo=timezone.utc)
        chart_end = datetime.combine(
            chart_end_date + timedelta(days=1), time.min, tzinfo=timezone.utc
        )

        with Session(sync_engine) as session:
            stats = {
                "users": _count_value(
                    session,
                    select(func.count()).select_from(models.User),
                ),
                "provider_accounts": _count_value(
                    session,
                    select(func.count()).select_from(models.ProviderAccount),
                ),
                "provider_accounts_active": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.ProviderAccount)
                    .where(models.ProviderAccount.status == models.ProviderStatus.ACTIVE),
                ),
                "provider_accounts_disconnected": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.ProviderAccount)
                    .where(
                        models.ProviderAccount.status
                        == models.ProviderStatus.DISCONNECTED
                    ),
                ),
                "installations": _count_value(
                    session,
                    select(func.count()).select_from(models.ProviderInstallation),
                ),
                "repos_total": _count_value(
                    session,
                    select(func.count()).select_from(models.Repository),
                ),
                "repos_private": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Repository)
                    .where(models.Repository.is_private.is_(True)),
                ),
                "repos_archived": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Repository)
                    .where(models.Repository.archived.is_(True)),
                ),
                "activity_items": _count_value(
                    session,
                    select(func.count()).select_from(models.ActivityItem),
                ),
                "sync_runs_total": _count_value(
                    session,
                    select(func.count()).select_from(models.SyncRun),
                ),
                "tasks_total": _count_value(
                    session,
                    select(func.count()).select_from(models.Task),
                ),
            }

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
            users_today = _count_value(
                session,
                select(func.count())
                .select_from(models.User)
                .where(models.User.created_at >= now - timedelta(days=1)),
            )
            users_week = _count_value(
                session,
                select(func.count())
                .select_from(models.User)
                .where(models.User.created_at >= now - timedelta(days=7)),
            )

            accounts_in_window = _count_value(
                session,
                select(func.count())
                .select_from(models.ProviderAccount)
                .where(models.ProviderAccount.created_at >= window_start),
            )
            accounts_prev_window = _count_value(
                session,
                select(func.count())
                .select_from(models.ProviderAccount)
                .where(
                    models.ProviderAccount.created_at >= prev_window_start,
                    models.ProviderAccount.created_at < window_start,
                ),
            )

            repos_in_window = _count_value(
                session,
                select(func.count())
                .select_from(models.Repository)
                .where(models.Repository.created_at >= window_start),
            )
            repos_prev_window = _count_value(
                session,
                select(func.count())
                .select_from(models.Repository)
                .where(
                    models.Repository.created_at >= prev_window_start,
                    models.Repository.created_at < window_start,
                ),
            )
            repos_today = _count_value(
                session,
                select(func.count())
                .select_from(models.Repository)
                .where(models.Repository.created_at >= now - timedelta(days=1)),
            )
            repos_week = _count_value(
                session,
                select(func.count())
                .select_from(models.Repository)
                .where(models.Repository.created_at >= now - timedelta(days=7)),
            )

            activities_in_window = _count_value(
                session,
                select(func.count())
                .select_from(models.ActivityItem)
                .where(models.ActivityItem.occurred_at >= window_start),
            )
            activities_prev_window = _count_value(
                session,
                select(func.count())
                .select_from(models.ActivityItem)
                .where(
                    models.ActivityItem.occurred_at >= prev_window_start,
                    models.ActivityItem.occurred_at < window_start,
                ),
            )
            activities_today = _count_value(
                session,
                select(func.count())
                .select_from(models.ActivityItem)
                .where(models.ActivityItem.occurred_at >= now - timedelta(days=1)),
            )

            sync_statuses: dict[str, int] = {
                "RUNNING": 0,
                "SUCCESS": 0,
                "FAILED": 0,
            }
            for status, count in session.exec(
                select(models.SyncRun.status, func.count()).group_by(
                    models.SyncRun.status
                )
            ).all():
                key = _normalize_enum_value(status)
                sync_statuses[key] = int(count or 0)

            task_statuses = {status.value: 0 for status in models.TaskStatus}
            for status, count in session.exec(
                select(models.Task.status, func.count()).group_by(models.Task.status)
            ).all():
                key = _normalize_enum_value(status)
                task_statuses[key] = int(count or 0)

            sync_recent = {
                "total": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.SyncRun)
                    .where(models.SyncRun.started_at >= window_start),
                ),
                "success": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.SyncRun)
                    .where(
                        models.SyncRun.started_at >= window_start,
                        models.SyncRun.status == "SUCCESS",
                    ),
                ),
                "failed": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.SyncRun)
                    .where(
                        models.SyncRun.started_at >= window_start,
                        models.SyncRun.status == "FAILED",
                    ),
                ),
            }
            task_recent = {
                "succeeded": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Task)
                    .where(
                        models.Task.finished_at >= window_start,
                        models.Task.status == models.TaskStatus.SUCCEEDED,
                    ),
                ),
                "failed": _count_value(
                    session,
                    select(func.count())
                    .select_from(models.Task)
                    .where(
                        models.Task.finished_at >= window_start,
                        models.Task.status == models.TaskStatus.FAILED,
                    ),
                ),
            }

            latest_sync_run = session.exec(
                select(models.SyncRun).order_by(models.SyncRun.started_at.desc())
            ).first()
            latest_sync = None
            if latest_sync_run:
                latest_sync_at = latest_sync_run.finished_at or latest_sync_run.started_at
                latest_sync = {
                    "status": latest_sync_run.status,
                    "label": _format_timestamp(latest_sync_at),
                }

            latest_task_run = session.exec(
                select(models.Task)
                .where(models.Task.finished_at.is_not(None))
                .order_by(models.Task.finished_at.desc())
            ).first()
            latest_task = None
            if latest_task_run:
                latest_task = {
                    "status": _normalize_enum_value(latest_task_run.status),
                    "label": _format_timestamp(latest_task_run.finished_at),
                }

            buckets = _build_buckets(chart_start_date, chart_end_date, bucket_days=bucket_days)
            user_daily = _fetch_daily_counts(
                session, models.User, models.User.created_at, chart_start, chart_end
            )
            repo_daily = _fetch_daily_counts(
                session,
                models.Repository,
                models.Repository.created_at,
                chart_start,
                chart_end,
            )
            repo_archived_daily = _fetch_daily_counts(
                session,
                models.Repository,
                models.Repository.updated_at,
                chart_start,
                chart_end,
                filters=[models.Repository.archived.is_(True)],
            )
            base_users = _count_value(
                session,
                select(func.count())
                .select_from(models.User)
                .where(models.User.created_at < chart_start),
            )
            base_repos = _count_value(
                session,
                select(func.count())
                .select_from(models.Repository)
                .where(models.Repository.created_at < chart_start),
            )

            user_signups = []
            cumulative_users = base_users
            for bucket in buckets:
                added = _sum_daily_in_bucket(
                    user_daily, bucket["start"], bucket["end"]
                )
                cumulative_users += added
                user_signups.append(
                    {
                        "label": bucket["label"],
                        "signups": added,
                        "cumulative": cumulative_users,
                    }
                )

            repo_growth = []
            cumulative_repos = base_repos
            for bucket in buckets:
                added = _sum_daily_in_bucket(
                    repo_daily, bucket["start"], bucket["end"]
                )
                archived = _sum_daily_in_bucket(
                    repo_archived_daily, bucket["start"], bucket["end"]
                )
                net = added - archived
                cumulative_repos += net
                repo_growth.append(
                    {
                        "label": bucket["label"],
                        "added": added,
                        "archived": archived,
                        "net": net,
                        "cumulative": cumulative_repos,
                    }
                )

            activity_type_rows = session.exec(
                select(
                    func.date(models.ActivityItem.occurred_at),
                    models.ActivityItem.type,
                    func.count(),
                )
                .where(
                    models.ActivityItem.occurred_at >= chart_start,
                    models.ActivityItem.occurred_at < chart_end,
                )
                .group_by(
                    func.date(models.ActivityItem.occurred_at),
                    models.ActivityItem.type,
                )
            ).all()
            activity_daily_by_type: dict[date, dict[str, int]] = {}
            type_map = {
                "commit": "commits",
                "pr_opened": "prs",
                "pr_merged": "prs",
                "review": "prs",
                "issue_opened": "issues",
                "issue_closed": "issues",
            }
            for raw_date, activity_type, count in activity_type_rows:
                bucket_date = _coerce_date(raw_date)
                category = type_map.get(str(activity_type))
                if not category:
                    continue
                activity_daily_by_type.setdefault(
                    bucket_date, {"commits": 0, "prs": 0, "issues": 0}
                )[category] += int(count or 0)

            activity_trends = []
            for bucket in buckets:
                commits = 0
                prs = 0
                issues = 0
                current_date = bucket["start"]
                end_date = bucket["end"]
                while current_date < end_date:
                    counts = activity_daily_by_type.get(current_date, {})
                    commits += counts.get("commits", 0)
                    prs += counts.get("prs", 0)
                    issues += counts.get("issues", 0)
                    current_date += timedelta(days=1)
                activity_trends.append(
                    {
                        "label": bucket["label"],
                        "commits": commits,
                        "prs": prs,
                        "issues": issues,
                        "total": commits + prs + issues,
                    }
                )

            daily_window_start = datetime.combine(
                (now.date() - timedelta(days=6)), time.min, tzinfo=timezone.utc
            )
            daily_window_end = datetime.combine(
                now.date() + timedelta(days=1), time.min, tzinfo=timezone.utc
            )
            daily_user_counts = _fetch_daily_counts(
                session,
                models.User,
                models.User.created_at,
                daily_window_start,
                daily_window_end,
            )
            daily_repo_counts = _fetch_daily_counts(
                session,
                models.Repository,
                models.Repository.created_at,
                daily_window_start,
                daily_window_end,
            )
            daily_activity_counts = _fetch_daily_counts(
                session,
                models.ActivityItem,
                models.ActivityItem.occurred_at,
                daily_window_start,
                daily_window_end,
            )
            weekday_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            weekday_totals = {idx: {"users": 0, "repos": 0, "activities": 0} for idx in range(7)}
            current_date = daily_window_start.date()
            end_date = daily_window_end.date()
            while current_date < end_date:
                idx = current_date.weekday()
                weekday_totals[idx]["users"] += daily_user_counts.get(current_date, 0)
                weekday_totals[idx]["repos"] += daily_repo_counts.get(current_date, 0)
                weekday_totals[idx]["activities"] += daily_activity_counts.get(
                    current_date, 0
                )
                current_date += timedelta(days=1)
            daily_stats = [
                {
                    "label": weekday_labels[idx],
                    "users": values["users"],
                    "repos": values["repos"],
                    "activities": values["activities"],
                }
                for idx, values in weekday_totals.items()
            ]

            total_users_before_window = _count_value(
                session,
                select(func.count())
                .select_from(models.User)
                .where(models.User.created_at < window_start),
            )
            total_repos_before_window = _count_value(
                session,
                select(func.count())
                .select_from(models.Repository)
                .where(models.Repository.created_at < window_start),
            )
            total_activity_before_window = _count_value(
                session,
                select(func.count())
                .select_from(models.ActivityItem)
                .where(models.ActivityItem.occurred_at < window_start),
            )

            active_users_window = _count_value(
                session,
                select(func.count(func.distinct(models.ActivityItem.user_id)))
                .select_from(models.ActivityItem)
                .where(
                    models.ActivityItem.occurred_at >= window_start,
                    models.ActivityItem.occurred_at < now,
                ),
            )
            active_users_prev = _count_value(
                session,
                select(func.count(func.distinct(models.ActivityItem.user_id)))
                .select_from(models.ActivityItem)
                .where(
                    models.ActivityItem.occurred_at >= prev_window_start,
                    models.ActivityItem.occurred_at < window_start,
                ),
            )
            connect_total_prev = _count_value(
                session,
                select(func.count())
                .select_from(models.ProviderAccount)
                .where(models.ProviderAccount.created_at < window_start),
            )
            connect_active_prev = _count_value(
                session,
                select(func.count())
                .select_from(models.ProviderAccount)
                .where(
                    models.ProviderAccount.created_at < window_start,
                    models.ProviderAccount.status == models.ProviderStatus.ACTIVE,
                ),
            )

            system_metrics = [
                {
                    "metric": "Avg Activities/User",
                    "current": _safe_ratio(stats["activity_items"], stats["users"]),
                    "previous": _safe_ratio(total_activity_before_window, total_users_before_window),
                    "unit": "",
                    "precision": 1,
                },
                {
                    "metric": "Avg Repos/User",
                    "current": _safe_ratio(stats["repos_total"], stats["users"]),
                    "previous": _safe_ratio(total_repos_before_window, total_users_before_window),
                    "unit": "",
                    "precision": 1,
                },
                {
                    "metric": "Active User Rate",
                    "current": _safe_ratio(active_users_window, stats["users"]) * 100,
                    "previous": _safe_ratio(active_users_prev, total_users_before_window) * 100,
                    "unit": "%",
                    "precision": 1,
                },
                {
                    "metric": "Provider Connect Rate",
                    "current": _safe_ratio(
                        stats["provider_accounts_active"], stats["provider_accounts"]
                    )
                    * 100,
                    "previous": _safe_ratio(connect_active_prev, connect_total_prev) * 100,
                    "unit": "%",
                    "precision": 1,
                },
            ]
            for item in system_metrics:
                current_value = float(item["current"])
                previous_value = float(item["previous"])
                item["change"] = _percent_change(
                    int(round(current_value * 1000)),
                    int(round(previous_value * 1000)),
                )

            task_window_start = now - timedelta(hours=24)
            recent_tasks = session.exec(
                select(models.Task).where(models.Task.finished_at >= task_window_start)
            ).all()
            task_success = sum(
                1 for task in recent_tasks if task.status == models.TaskStatus.SUCCEEDED
            )
            task_failures = sum(
                1 for task in recent_tasks if task.status == models.TaskStatus.FAILED
            )
            task_durations = [
                (task.finished_at - task.started_at).total_seconds()
                for task in recent_tasks
                if task.finished_at and task.started_at
            ]
            task_avg_duration = (
                sum(task_durations) / len(task_durations) if task_durations else None
            )
            queued_now = _count_value(
                session,
                select(func.count())
                .select_from(models.Task)
                .where(
                    models.Task.status.in_(
                        [models.TaskStatus.PENDING, models.TaskStatus.RUNNING]
                    )
                ),
            )
            task_metrics = {
                "total_processed": len(recent_tasks),
                "success_rate": _safe_ratio(task_success, len(recent_tasks)) * 100,
                "avg_duration": _format_duration(task_avg_duration),
                "queued_now": queued_now,
                "failed": task_failures,
            }

            recent_syncs = session.exec(
                select(models.SyncRun).where(models.SyncRun.started_at >= task_window_start)
            ).all()
            sync_success = sum(1 for sync in recent_syncs if sync.status == "SUCCESS")
            sync_failed = sum(1 for sync in recent_syncs if sync.status == "FAILED")
            sync_running = sum(1 for sync in recent_syncs if sync.status == "RUNNING")
            sync_items_total = sum(sync.items or 0 for sync in recent_syncs)
            sync_durations = [
                (sync.finished_at - sync.started_at).total_seconds()
                for sync in recent_syncs
                if sync.finished_at and sync.started_at
            ]
            sync_avg_duration = (
                sum(sync_durations) / len(sync_durations) if sync_durations else None
            )
            sync_metrics = {
                "total_runs": len(recent_syncs),
                "avg_items_per_run": _safe_ratio(sync_items_total, len(recent_syncs)),
                "total_items_synced": sync_items_total,
                "avg_duration": _format_duration(sync_avg_duration),
                "success": sync_success,
                "failed": sync_failed,
                "running": sync_running,
            }

            growth_metrics = [
                {
                    "label": "Total Users",
                    "total": stats["users"],
                    "delta": users_in_window,
                    "percent_change": _percent_change(
                        users_in_window, users_prev_window
                    ),
                    "subtitle": f"in {window_label.lower()}",
                    "detail": f"{users_today} today, {users_week} last 7d",
                    "icon": "fa-solid fa-users",
                },
                {
                    "label": "Provider Accounts",
                    "total": stats["provider_accounts"],
                    "delta": accounts_in_window,
                    "percent_change": _percent_change(
                        accounts_in_window, accounts_prev_window
                    ),
                    "subtitle": f"in {window_label.lower()}",
                    "detail": (
                        f"{stats['provider_accounts_active']} active, "
                        f"{stats['provider_accounts_disconnected']} disconnected"
                    ),
                    "icon": "fa-solid fa-link",
                },
                {
                    "label": "Repositories",
                    "total": stats["repos_total"],
                    "delta": repos_in_window,
                    "percent_change": _percent_change(repos_in_window, repos_prev_window),
                    "subtitle": f"in {window_label.lower()}",
                    "detail": f"{repos_today} today, {repos_week} last 7d",
                    "icon": "fa-solid fa-code-branch",
                },
                {
                    "label": "Activities",
                    "total": stats["activity_items"],
                    "delta": activities_in_window,
                    "percent_change": _percent_change(
                        activities_in_window, activities_prev_window
                    ),
                    "subtitle": f"in {window_label.lower()}",
                    "detail": f"{activities_today} today",
                    "icon": "fa-solid fa-bolt",
                },
            ]

        dashboard_data = {
            "userSignups": user_signups,
            "repoGrowth": repo_growth,
            "activityTrends": activity_trends,
            "dailyStats": daily_stats,
        }

        return templates.TemplateResponse(
            request=request,
            name=self.template_path,
            context={
                "title": self.title(request),
                "stats": stats,
                "growth_metrics": growth_metrics,
                "sync_statuses": sync_statuses,
                "task_statuses": task_statuses,
                "sync_recent": sync_recent,
                "task_recent": task_recent,
                "latest_sync": latest_sync,
                "latest_task": latest_task,
                "system_metrics": system_metrics,
                "task_metrics": task_metrics,
                "sync_metrics": sync_metrics,
                "user_signups": user_signups,
                "repo_growth": repo_growth,
                "activity_trends": activity_trends,
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
    def __init__(self) -> None:
        super().__init__()

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
        with Session(sync_engine) as session:
            statement = select(models.User).where(models.User.clerk_id == clerk_id)
            return session.exec(statement).first()

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
        with Session(sync_engine) as session:
            statement = select(models.User).where(models.User.id == session_user_id)
            return session.exec(statement).first()

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
            label = clerk_user.handle or clerk_user.display_name or clerk_user.clerk_id
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
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Signing out</title>
  </head>
  <body>
    <p>Signing out...</p>
    <script async crossorigin="anonymous"
            data-clerk-publishable-key="{settings.clerk_publishable_key}"
            src="{settings.clerk_js_url}"></script>
    <script>
      window.addEventListener("load", function () {{
        if (!window.Clerk) {{
          window.location.href = "{redirect_url}";
          return;
        }}
        Clerk.load()
          .then(function () {{
            return Clerk.signOut({{ redirectUrl: "{redirect_url}" }});
          }})
          .catch(function () {{
            window.location.href = "{redirect_url}";
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

    invalid = [
        job
        for job in normalized
        if job != "task_worker" and job not in _SCHEDULED_JOB_HANDLERS
    ]
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

    settings = get_settings()
    background = BackgroundTasks()
    for job in normalized:
        if job == "task_worker":
            task_concurrency = settings.task_worker_concurrency
            if task_concurrency is None:
                task_concurrency = settings.sync_scheduler_max_concurrent
            background.add_task(
                run_task_worker,
                settings.task_worker_batch_size,
                settings.task_worker_lease_seconds,
                task_concurrency,
            )
        else:
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
    admin.templates.env.globals["list_js_version"] = lambda: int(
        list_js_path.stat().st_mtime
    )
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

    user_view = build_model_view(models.User)
    user_settings_view = build_model_view(models.UserSettings)
    provider_account_view = build_model_view(models.ProviderAccount)
    provider_installation_view = build_model_view(models.ProviderInstallation)
    repository_view = build_model_view(models.Repository)
    repo_sync_cursor_view = build_model_view(models.RepoSyncCursor)
    sync_run_view = build_model_view(models.SyncRun)
    activity_item_view = build_model_view(models.ActivityItem)
    activity_fact_view = build_model_view(models.ActivityFactDaily)
    score_snapshot_view = build_model_view(models.ScoreSnapshot)
    leaderboard_view = build_model_view(models.LeaderboardEntryRecord)
    task_view = build_model_view(models.Task)

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
            views=[
                user_view,
                user_settings_view,
                provider_account_view,
                provider_installation_view,
            ],
        )
    )
    admin.add_view(
        DropDown(
            "Repositories",
            icon="fa-solid fa-code-branch",
            views=[repository_view, sync_run_view, repo_sync_cursor_view],
        )
    )
    admin.add_view(
        DropDown(
            "Activity",
            icon="fa-solid fa-bolt",
            views=[activity_item_view, activity_fact_view],
        )
    )
    admin.add_view(
        DropDown(
            "Scoring",
            icon="fa-solid fa-chart-line",
            views=[score_snapshot_view, leaderboard_view],
        )
    )
    admin.add_view(
        DropDown(
            "Operations",
            icon="fa-solid fa-gears",
            views=[task_view, scheduler_view],
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
    with Session(sync_engine) as session:
        statement = select(models.User).where(models.User.clerk_id == clerk_id)
        user = session.exec(statement).first()
    if not user:
        return _error("User not found.")
    if user.role != models.UserRole.ADMIN:
        return _error("User is not an admin.")
    label = user.handle or user.display_name or user.clerk_id
    request.session.update({"admin_user_id": user.id, "admin_user_label": label})

    redirect_to = request.query_params.get("redirect")
    if not redirect_to or "://" in redirect_to or redirect_to.startswith("//"):
        redirect_to = settings.admin_base_url
    return RedirectResponse(redirect_to, status_code=303)
