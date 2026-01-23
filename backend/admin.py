from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
from pathlib import Path
import logging

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
from settings import get_settings

logger = logging.getLogger(__name__)

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
    models.User: [
        "id",
        "handle",
        "display_name",
        "clerk_id",
        "role",
        "created_at",
    ],
}

_MODEL_VIEW_OPTIONS: dict[type[models.SQLModel], dict[str, str]] = {
    models.User: {"icon": "fa-solid fa-user"},
}

_DEFAULT_SCHEDULED_JOBS = (
    "sync_fanout",
    "task_worker",
    "leaderboard_daily",
    "leaderboard_weekly",
    "leaderboard_monthly",
)

_CLERK_SESSION_COOKIES = ("__session", "__clerk_session", "__clerk_jwt", "__clerk_db_jwt")


def _noop_job(job_name: str) -> None:
    logger.warning("Scheduled job '%s' is not configured.", job_name)


_SCHEDULED_JOB_HANDLERS = {
    job: (lambda job_name=job: _noop_job(job_name)) for job in _DEFAULT_SCHEDULED_JOBS
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

        stats = {
            "users": 0,
            "provider_accounts": 0,
            "provider_accounts_active": 0,
            "provider_accounts_disconnected": 0,
            "repos_total": 0,
            "repos_private": 0,
            "repos_archived": 0,
            "activity_items": 0,
        }
        users_in_window = 0
        users_prev_window = 0
        users_today = 0
        users_week = 0
        admins_total = 0
        admins_in_window = 0
        admins_prev_window = 0
        admins_today = 0

        daily_counts: dict[date, int] = {}
        recent_daily_counts: dict[date, int] = {}

        try:
            with Session(sync_engine) as session:
                stats["users"] = _count_value(
                    session, select(func.count()).select_from(models.User)
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
                today_start = datetime.combine(
                    now.date(), time.min, tzinfo=timezone.utc
                )
                users_today = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at >= today_start),
                )
                week_start = now - timedelta(days=7)
                users_week = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.created_at >= week_start),
                )
                admins_total = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(models.User.role == models.UserRole.ADMIN),
                )
                admins_in_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(
                        models.User.role == models.UserRole.ADMIN,
                        models.User.created_at >= window_start,
                    ),
                )
                admins_prev_window = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(
                        models.User.role == models.UserRole.ADMIN,
                        models.User.created_at >= prev_window_start,
                        models.User.created_at < window_start,
                    ),
                )
                admins_today = _count_value(
                    session,
                    select(func.count())
                    .select_from(models.User)
                    .where(
                        models.User.role == models.UserRole.ADMIN,
                        models.User.created_at >= today_start,
                    ),
                )
                daily_counts = _fetch_daily_counts(
                    session,
                    models.User,
                    models.User.created_at,
                    chart_start,
                    chart_end,
                )
                recent_start = now.date() - timedelta(days=6)
                recent_start_dt = datetime.combine(
                    recent_start, time.min, tzinfo=timezone.utc
                )
                recent_end_dt = datetime.combine(
                    now.date() + timedelta(days=1), time.min, tzinfo=timezone.utc
                )
                recent_daily_counts = _fetch_daily_counts(
                    session,
                    models.User,
                    models.User.created_at,
                    recent_start_dt,
                    recent_end_dt,
                )
        except Exception:
            logger.warning("Admin dashboard query failed; using defaults.", exc_info=True)

        buckets = _build_buckets(
            chart_start_date, chart_end_date, bucket_days=bucket_days
        )

        user_signups: list[dict[str, object]] = []
        cumulative = 0
        for bucket in buckets:
            signups = _sum_daily_in_bucket(
                daily_counts, bucket["start"], bucket["end"]
            )
            cumulative += signups
            user_signups.append(
                {
                    "label": bucket["label"],
                    "signups": signups,
                    "cumulative": cumulative,
                }
            )

        repo_growth = [
            {
                "label": bucket["label"],
                "added": 0,
                "archived": 0,
                "net": 0,
            }
            for bucket in buckets
        ]

        activity_trends = [
            {
                "label": bucket["label"],
                "commits": 0,
                "prs": 0,
                "issues": 0,
            }
            for bucket in buckets
        ]

        daily_stats: list[dict[str, object]] = []
        recent_start = now.date() - timedelta(days=6)
        for offset in range(7):
            day = recent_start + timedelta(days=offset)
            daily_stats.append(
                {
                    "label": day.strftime("%m/%d"),
                    "users": int(recent_daily_counts.get(day, 0)),
                    "repos": 0,
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
                "label": "Provider Accounts",
                "total": stats["provider_accounts"],
                "delta": 0,
                "percent_change": 0.0,
                "subtitle": f"in {window_label.lower()}",
                "detail": "0 active, 0 disconnected",
                "icon": "fa-solid fa-link",
            },
            {
                "label": "Repositories",
                "total": stats["repos_total"],
                "delta": 0,
                "percent_change": 0.0,
                "subtitle": f"in {window_label.lower()}",
                "detail": "0 today, 0 last 7d",
                "icon": "fa-solid fa-code-branch",
            },
            {
                "label": "Activities",
                "total": stats["activity_items"],
                "delta": 0,
                "percent_change": 0.0,
                "subtitle": f"in {window_label.lower()}",
                "detail": "0 today",
                "icon": "fa-solid fa-bolt",
            },
        ]

        admin_ratio = _safe_ratio(admins_total, stats["users"]) * 100
        prev_admin_ratio = _safe_ratio(admins_prev_window, users_prev_window) * 100
        system_metrics = [
            {
                "metric": "Admin share",
                "current": admin_ratio,
                "previous": prev_admin_ratio,
                "change": _percent_change(admin_ratio, prev_admin_ratio),
                "precision": 1,
                "unit": "%",
            },
            {
                "metric": "Signups / day",
                "current": _safe_ratio(users_in_window, range_days),
                "previous": _safe_ratio(users_prev_window, range_days),
                "change": _percent_change(
                    _safe_ratio(users_in_window, range_days),
                    _safe_ratio(users_prev_window, range_days),
                ),
                "precision": 1,
                "unit": "",
            },
        ]

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

    user_view = build_model_view(models.User)

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
            views=[user_view],
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
    label = user.handle or user.display_name or user.clerk_id
    request.session.update({"admin_user_id": user.id, "admin_user_label": label})

    redirect_to = request.query_params.get("redirect")
    if not redirect_to or "://" in redirect_to or redirect_to.startswith("//"):
        redirect_to = settings.admin_base_url
    return RedirectResponse(redirect_to, status_code=303)
