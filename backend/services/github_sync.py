from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from functools import partial
from typing import Any

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import (
    ActivityFactDaily,
    ActivityItem,
    Provider,
    ProviderAccount,
    ProviderInstallation,
    ProviderStatus,
    RepoSyncCursor,
    Repository,
    ScoreSnapshot,
    SyncRun,
)
from services.logger import (
    AppLogger,
    log_debug as log_debug_base,
    log_error as log_error_base,
    log_info as log_info_base,
    log_warn as log_warn_base,
)
from services.github_app import (
    GitHubAPIError,
    get_installation_token,
    github_fetch_with_token,
    list_github_app_installations,
    list_installation_repositories,
)
from services.github_webhooks import purge_installation_data
from services.github_installations import link_org_installations_for_user
from services.installations import (
    get_provider_installation_for_user,
    get_provider_installation_user_ids,
    get_provider_installations_for_user,
    link_provider_installation_users,
    upsert_provider_installation,
)
from services.providers import get_provider_account
from services.schemas.core import ClerkProfile
from services.scoring import (
    PeriodWindow,
    ScorePeriod,
    get_activity_summary_for_period,
    get_period_window,
    refresh_score_snapshot_for_period,
    resolve_score_period,
)
from services.users import ensure_user_from_clerk, get_or_create_user_by_clerk_id

DEFAULT_PER_PAGE = 100
DEFAULT_LOOKBACK_DAYS = 0
NON_SCORED_METRIC_KEYS = {"prs_opened", "issues_opened"}
NON_SCORED_TYPE_TO_METRIC = {
    "pr_opened": "prs_opened",
    "issue_opened": "issues_opened",
}
NON_SCORED_TYPES = set(NON_SCORED_TYPE_TO_METRIC.keys())
SCORED_METRICS = {"commits", "prs_merged", "reviews", "issues_closed"}

logger = AppLogger.get_logger("github_sync")
log_info = partial(log_info_base, logger)
log_debug = partial(log_debug_base, logger)
log_warn = partial(log_warn_base, logger)
log_error = partial(log_error_base, logger)


@dataclass
class EventMetric:
    key: str
    value: float


@dataclass
class ActivityDraft:
    item: dict[str, Any]
    metrics: list[EventMetric]


@dataclass
class FactDelta:
    day: date
    bucket: str
    metric_key: str
    value: float
    mode: str


@dataclass
class GithubSyncResult:
    ok: bool
    error: str | None
    repos: int
    items: int
    facts: int
    last_synced_at: str | None = None
    warnings: list[str] | None = None
    sync_run_id: int | None = None


def to_utc_date(value: datetime | date) -> date:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date()
    return value


def to_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    text = value.replace("Z", "+00:00")
    return datetime.fromisoformat(text)


def normalize_language(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    return normalized if normalized else None


def add_utc_days(value: datetime, days: int) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value + timedelta(days=days)


def to_utc_month_start(value: datetime) -> datetime:
    value = value.astimezone(timezone.utc)
    return datetime(value.year, value.month, 1, tzinfo=timezone.utc)


def add_utc_months(value: datetime, months: int) -> datetime:
    value = value.astimezone(timezone.utc)
    year = value.year + (value.month - 1 + months) // 12
    month = (value.month - 1 + months) % 12 + 1
    return datetime(year, month, 1, tzinfo=timezone.utc)


def build_fact_key(day: date, metric_key: str, bucket: str) -> str:
    return f"{day.isoformat()}|{metric_key}|{bucket}"


def scalar_value(value: Any) -> Any:
    if isinstance(value, tuple):
        return value[0]
    return value


def normalize_login(value: str) -> str:
    return value.strip().lower()


def collect_score_windows(period: ScorePeriod, dates: list[datetime]) -> list[PeriodWindow]:
    windows_by_key: dict[str, PeriodWindow] = {}
    for value in dates:
        window = get_period_window(period, value)
        windows_by_key[window.start.isoformat()] = window
    return sorted(windows_by_key.values(), key=lambda window: window.start)


def collect_score_windows_for_range(
    period: ScorePeriod, start_date: datetime, end_date: datetime
) -> list[PeriodWindow]:
    windows: list[PeriodWindow] = []
    cursor = to_utc_month_start(start_date)
    end = to_utc_month_start(end_date)

    while cursor <= end:
        windows.append(get_period_window(period, cursor))
        cursor = add_utc_months(cursor, 1)

    return windows


async def get_cursor_value(
    session: Session, user_id: int, repository_id: int, cursor_key: str
) -> datetime | None:
    statement = select(RepoSyncCursor.cursor_value).where(
        RepoSyncCursor.user_id == user_id,
        RepoSyncCursor.repository_id == repository_id,
        RepoSyncCursor.cursor_key == cursor_key,
    )
    return scalar_value((await session.exec(statement)).first())


async def set_cursor_value(
    session: Session,
    user_id: int,
    repository_id: int,
    cursor_key: str,
    cursor_value: datetime,
) -> None:
    statement = insert(RepoSyncCursor).values(
        user_id=user_id,
        provider=Provider.GITHUB,
        repository_id=repository_id,
        cursor_key=cursor_key,
        cursor_value=cursor_value,
    )
    statement = statement.on_conflict_do_update(
        index_elements=[
            RepoSyncCursor.user_id,
            RepoSyncCursor.repository_id,
            RepoSyncCursor.cursor_key,
        ],
        set_={"cursor_value": cursor_value},
    )
    await session.exec(statement)
    await session.commit()


def add_fact_delta(
    deltas: dict[str, FactDelta],
    day: date,
    metric_key: str,
    bucket: str,
    value: float,
    mode: str = "increment",
) -> None:
    key = build_fact_key(day, metric_key, bucket)
    existing = deltas.get(key)
    if existing:
        existing.value += value
        return

    deltas[key] = FactDelta(
        day=day,
        bucket=bucket,
        metric_key=metric_key,
        value=value,
        mode=mode,
    )


async def upsert_facts(
    session: Session,
    user_id: int,
    provider_account_id: int | None,
    deltas: list[FactDelta],
) -> int:
    if not deltas:
        log_debug("facts upsert skipped (no deltas)", {"user_id": user_id})
        return 0

    batch_size = 25
    total = 0

    log_debug(
        "facts upsert start",
        {"user_id": user_id, "deltas": len(deltas), "batchSize": batch_size},
    )

    for start in range(0, len(deltas), batch_size):
        batch = deltas[start : start + batch_size]
        log_debug(
            "facts upsert batch",
            {"user_id": user_id, "batchStart": start, "batchSize": len(batch)},
        )
        for delta in batch:
            update_values: dict[str, Any]
            if delta.mode == "set":
                update_values = {"value": delta.value}
            else:
                update_values = {"value": ActivityFactDaily.value + delta.value}

            statement = insert(ActivityFactDaily).values(
                user_id=user_id,
                provider=Provider.GITHUB,
                provider_account_id=provider_account_id,
                day=delta.day,
                metric_key=delta.metric_key,
                bucket=delta.bucket,
                value=delta.value,
            )
            statement = statement.on_conflict_do_update(
                index_elements=[
                    ActivityFactDaily.user_id,
                    ActivityFactDaily.provider,
                    ActivityFactDaily.day,
                    ActivityFactDaily.metric_key,
                    ActivityFactDaily.bucket,
                ],
                set_=update_values,
            )
            await session.exec(statement)
        await session.commit()
        total += len(batch)

    log_debug("facts upsert complete", {"user_id": user_id, "total": total})
    return total


async def backfill_non_scored_facts(
    session: Session, user_id: int, deltas: dict[str, FactDelta]
) -> int:
    before_size = len(deltas)
    log_debug("backfill non-scored start", {"user_id": user_id, "existingDeltas": before_size})

    statement = select(
        ActivityItem.occurred_at,
        ActivityItem.repo_full_name,
        ActivityItem.type,
    ).where(
        ActivityItem.user_id == user_id,
        ActivityItem.provider == Provider.GITHUB,
        ActivityItem.type.in_(NON_SCORED_TYPES),
    )
    items = (await session.exec(statement)).all()

    if not items:
        log_debug("backfill non-scored skipped (no items)", {"user_id": user_id})
        return 0

    for occurred_at, repo_full_name, item_type in items:
        metric_key = NON_SCORED_TYPE_TO_METRIC.get(item_type)
        if not metric_key:
            continue
        day = to_utc_date(occurred_at)
        bucket = repo_full_name or "global"
        add_fact_delta(deltas, day, metric_key, bucket, 1, "set")

    log_debug(
        "backfill non-scored complete",
        {"user_id": user_id, "items": len(items), "addedDeltas": len(deltas) - before_size},
    )
    return len(items)


async def filter_new_activity_drafts(
    session: Session, user_id: int, drafts: list[ActivityDraft]
) -> list[ActivityDraft]:
    if not drafts:
        log_debug("draft filter skipped (no drafts)", {"user_id": user_id})
        return []

    log_debug("draft filter start", {"user_id": user_id, "drafts": len(drafts)})
    provider_item_ids = [draft.item["provider_item_id"] for draft in drafts]
    statement = select(ActivityItem.provider_item_id).where(
        ActivityItem.user_id == user_id,
        ActivityItem.provider == Provider.GITHUB,
        ActivityItem.provider_item_id.in_(provider_item_ids),
    )
    existing = {scalar_value(value) for value in (await session.exec(statement)).all()}
    filtered: list[ActivityDraft] = []
    seen: set[str] = set()
    for draft in drafts:
        provider_item_id = draft.item.get("provider_item_id")
        if not isinstance(provider_item_id, str) or not provider_item_id:
            continue
        if provider_item_id in existing or provider_item_id in seen:
            continue
        seen.add(provider_item_id)
        filtered.append(draft)
    log_debug(
        "draft filter complete",
        {"user_id": user_id, "existing": len(existing), "newDrafts": len(filtered)},
    )
    return filtered


async def create_activity_items(session: Session, drafts: list[ActivityDraft]) -> int:
    if not drafts:
        log_debug("activity create skipped (no drafts)")
        return 0

    log_debug("activity create start", {"drafts": len(drafts)})
    items: list[dict[str, Any]] = []
    for draft in drafts:
        item = dict(draft.item)
        if "metadata" in item:
            item["metadata_"] = item.pop("metadata")
        items.append(item)
    statement = insert(ActivityItem).values(items)
    statement = statement.on_conflict_do_nothing(
        index_elements=[
            ActivityItem.user_id,
            ActivityItem.provider,
            ActivityItem.provider_item_id,
        ]
    )
    result = await session.exec(statement)
    await session.commit()
    rowcount = result.rowcount
    created = rowcount if rowcount is not None and rowcount >= 0 else len(drafts)
    log_debug("activity create complete", {"createdItems": created})
    return created


async def upsert_installation_for_user(
    session: Session, user_id: int, login: str
) -> dict[str, int | str] | None:
    log_debug("installation lookup start", {"user_id": user_id, "login": login})
    existing = await get_provider_installation_for_user(
        session, user_id, Provider.GITHUB
    )

    if existing:
        log_debug(
            "installation reuse",
            {"user_id": user_id, "installation_id": existing.installation_id},
        )
        return {
            "id": existing.id,
            "installation_id": existing.installation_id,
            "account_login": existing.account_login,
        }

    installations = await list_github_app_installations()
    log_debug(
        "installation list fetched",
        {"user_id": user_id, "installations": len(installations)},
    )

    match = None
    for installation in installations:
        account_login = (installation.get("account") or {}).get("login")
        if not account_login:
            continue
        if normalize_login(account_login) == normalize_login(login):
            match = installation
            break

    if not match:
        log_warn("installation match not found", {"user_id": user_id, "login": login})
        return None

    installation_id = str(match.get("id"))
    existing_installation = (await session.exec(
        select(ProviderInstallation).where(
            ProviderInstallation.provider == Provider.GITHUB,
            ProviderInstallation.installation_id == installation_id,
        )
    )).first()

    account_login = (match.get("account") or {}).get("login") or login
    account_type = (match.get("account") or {}).get("type") or "User"
    permissions = match.get("permissions")

    installation = await upsert_provider_installation(
        session,
        provider=Provider.GITHUB,
        installation_id=installation_id,
        owner_user_id=user_id,
        account_login=account_login,
        account_type=account_type,
        permissions=permissions,
        existing=existing_installation,
    )
    await link_provider_installation_users(session, installation, [user_id])

    log_debug(
        "installation upserted",
        {
            "user_id": user_id,
            "installation_id": installation.installation_id,
            "account_login": installation.account_login,
        },
    )
    return {
        "id": installation.id,
        "installation_id": installation.installation_id,
        "account_login": installation.account_login,
    }


async def upsert_repositories(
    session: Session, installation_id: int, repositories: list[dict[str, Any]]
) -> list[dict[str, int | str]]:
    log_debug(
        "repository upsert start",
        {"installation_id": installation_id, "repositories": len(repositories)},
    )
    results: list[dict[str, int | str]] = []

    for repo in repositories:
        owner_login = (repo.get("owner") or {}).get("login") or ""
        log_debug(
            "repository upsert",
            {
                "installation_id": installation_id,
                "repoId": repo.get("id"),
                "full_name": repo.get("full_name"),
                "private": repo.get("private"),
                "archived": repo.get("archived", False),
            },
        )

        provider_repo_id = str(repo.get("id"))
        existing = (await session.exec(
            select(Repository).where(
                Repository.provider == Provider.GITHUB,
                Repository.provider_repo_id == provider_repo_id,
            )
        )).first()

        primary_language = normalize_language(repo.get("language"))
        if existing:
            existing.full_name = repo.get("full_name")
            existing.name = repo.get("name")
            existing.owner_login = owner_login
            existing.primary_language = primary_language
            existing.is_private = bool(repo.get("private"))
            existing.archived = bool(repo.get("archived", False))
            existing.default_branch = repo.get("default_branch")
            existing.installation_id = installation_id
            session.add(existing)
            await session.commit()
            await session.refresh(existing)
            record = existing
        else:
            record = Repository(
                provider=Provider.GITHUB,
                provider_repo_id=provider_repo_id,
                full_name=repo.get("full_name"),
                name=repo.get("name"),
                owner_login=owner_login,
                primary_language=primary_language,
                is_private=bool(repo.get("private")),
                archived=bool(repo.get("archived", False)),
                default_branch=repo.get("default_branch"),
                installation_id=installation_id,
            )
            session.add(record)
            await session.commit()
            await session.refresh(record)

        results.append(
            {
                "id": record.id,
                "full_name": record.full_name,
                "name": record.name,
                "owner_login": record.owner_login,
            }
        )

    log_debug("repository upsert complete", {"installation_id": installation_id, "total": len(results)})
    return results


def build_metrics_metadata(
    metrics: list[EventMetric], extra: dict[str, Any] | None = None
) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "metrics": [{"key": metric.key, "value": metric.value} for metric in metrics],
    }
    if extra:
        for key, value in extra.items():
            if value is not None:
                metadata[key] = value
    return metadata


async def sync_commits(
    session: Session,
    installation_token: str,
    repository_id: int,
    repo_full_name: str,
    owner_login: str,
    repo_name: str,
    user_id: int,
    provider_account_id: int | None,
    login: str,
    lookback_start: datetime,
    sync_start: datetime,
    fact_deltas: dict[str, FactDelta],
    include_non_scored_facts: bool,
) -> int:
    cursor = await get_cursor_value(session, user_id, repository_id, "commits")
    since = cursor or lookback_start
    log_debug(
        "commits sync start",
        {
            "user_id": user_id,
            "repository_id": repository_id,
            "repo_full_name": repo_full_name,
            "since": since.isoformat(),
            "cursor": cursor.isoformat() if cursor else None,
            "includeNonScoredFacts": include_non_scored_facts,
        },
    )
    page = 1
    latest: datetime | None = cursor
    created_count = 0
    fetched_count = 0

    while True:
        commits = await github_fetch_with_token(
            installation_token,
            f"/repos/{owner_login}/{repo_name}/commits"
            f"?author={login}&since={since.isoformat()}&per_page={DEFAULT_PER_PAGE}&page={page}",
        )

        if not commits:
            log_debug("commits page empty", {"repo_full_name": repo_full_name, "page": page})
            break

        fetched_count += len(commits)
        log_debug(
            "commits page fetched",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "fetched": len(commits),
                "fetchedTotal": fetched_count,
            },
        )

        drafts: list[ActivityDraft] = []
        for commit in commits:
            commit_date = ((commit.get("commit") or {}).get("author") or {}).get("date")
            if not commit_date:
                continue
            occurred_at = to_datetime(commit_date)
            title = ((commit.get("commit") or {}).get("message") or "").split("\n")[0] or None
            metrics = [EventMetric(key="commits", value=1)]
            drafts.append(
                ActivityDraft(
                    item={
                        "user_id": user_id,
                        "provider": Provider.GITHUB,
                        "provider_account_id": provider_account_id,
                        "repository_id": repository_id,
                        "provider_item_id": f"commit:{commit.get('sha')}",
                        "type": "commit",
                        "occurred_at": occurred_at,
                        "repo_full_name": repo_full_name,
                        "title": title,
                        "url": commit.get("html_url"),
                        "metadata": build_metrics_metadata(metrics, {"sha": commit.get("sha")}),
                    },
                    metrics=metrics,
                )
            )

        log_debug("commits drafts built", {"repo_full_name": repo_full_name, "page": page, "drafts": len(drafts)})
        new_drafts = await filter_new_activity_drafts(session, user_id, drafts)
        created_count += await create_activity_items(session, new_drafts)
        log_debug(
            "commits page processed",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "newDrafts": len(new_drafts),
                "createdTotal": created_count,
            },
        )

        for draft in new_drafts:
            for metric in draft.metrics:
                day = to_utc_date(to_datetime(draft.item["occurred_at"]))
                bucket = repo_full_name
                if include_non_scored_facts or metric.key in SCORED_METRICS:
                    add_fact_delta(fact_deltas, day, metric.key, bucket, metric.value)

        for commit in commits:
            commit_date = ((commit.get("commit") or {}).get("author") or {}).get("date")
            if not commit_date:
                continue
            occurred_at = to_datetime(commit_date)
            if not latest or occurred_at > latest:
                latest = occurred_at

        if len(commits) < DEFAULT_PER_PAGE:
            break

        page += 1

    if latest:
        log_debug("commits cursor update", {"repo_full_name": repo_full_name, "latest": latest.isoformat()})
        await set_cursor_value(session, user_id, repository_id, "commits", latest)
    elif fetched_count == 0:
        log_debug(
            "commits cursor update (no fetch)",
            {"repo_full_name": repo_full_name, "syncStart": sync_start.isoformat()},
        )
        await set_cursor_value(session, user_id, repository_id, "commits", sync_start)

    log_debug(
        "commits sync complete",
        {
            "repo_full_name": repo_full_name,
            "pages": page,
            "fetched": fetched_count,
            "createdTotal": created_count,
        },
    )
    return created_count


def is_permission_error(error: Exception) -> bool:
    message = str(error)
    return (
        "Resource not accessible by integration" in message
        or "GitHub API error 403" in message
    )


def is_ignorable_error(error: Exception) -> bool:
    message = str(error)
    return "Git Repository is empty" in message or "GitHub API error 409" in message


def is_installation_not_found(error: Exception) -> bool:
    if isinstance(error, GitHubAPIError):
        if error.status_code != 404:
            return False
        return error.path.startswith("/app/installations/") or error.path.startswith("/installation/")
    message = str(error)
    return "GitHub API error 404" in message and "installation access token" in message


async def sync_pull_requests(
    session: Session,
    installation_token: str,
    repository_id: int,
    repo_full_name: str,
    owner_login: str,
    repo_name: str,
    user_id: int,
    provider_account_id: int | None,
    login: str,
    lookback_start: datetime,
    sync_start: datetime,
    fact_deltas: dict[str, FactDelta],
    include_non_scored_facts: bool,
) -> int:
    cursor = await get_cursor_value(session, user_id, repository_id, "pulls")
    since = cursor or lookback_start
    log_debug(
        "pulls sync start",
        {
            "user_id": user_id,
            "repository_id": repository_id,
            "repo_full_name": repo_full_name,
            "since": since.isoformat(),
            "cursor": cursor.isoformat() if cursor else None,
            "includeNonScoredFacts": include_non_scored_facts,
        },
    )
    page = 1
    latest: datetime | None = cursor
    created_count = 0
    fetched_count = 0

    while True:
        pulls = await github_fetch_with_token(
            installation_token,
            f"/repos/{owner_login}/{repo_name}/pulls"
            f"?state=all&sort=updated&direction=desc&per_page={DEFAULT_PER_PAGE}&page={page}",
        )

        if not pulls:
            log_debug("pulls page empty", {"repo_full_name": repo_full_name, "page": page})
            break

        fetched_count += len(pulls)
        log_debug(
            "pulls page fetched",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "fetched": len(pulls),
                "fetchedTotal": fetched_count,
            },
        )

        drafts: list[ActivityDraft] = []
        for pull in pulls:
            author_login = (pull.get("user") or {}).get("login")
            if normalize_login(author_login or "") != normalize_login(login):
                continue
            created_at = to_datetime(pull.get("created_at"))
            opened_metrics = [EventMetric(key="prs_opened", value=1)]
            drafts.append(
                ActivityDraft(
                    item={
                        "user_id": user_id,
                        "provider": Provider.GITHUB,
                        "provider_account_id": provider_account_id,
                        "repository_id": repository_id,
                        "provider_item_id": f"pr:{pull.get('id')}:opened",
                        "type": "pr_opened",
                        "occurred_at": created_at,
                        "repo_full_name": repo_full_name,
                        "title": pull.get("title"),
                        "number": pull.get("number"),
                        "url": pull.get("html_url"),
                        "metadata": build_metrics_metadata(opened_metrics),
                    },
                    metrics=opened_metrics,
                )
            )

            if pull.get("merged_at"):
                merged_at = to_datetime(pull.get("merged_at"))
                merged_metrics = [EventMetric(key="prs_merged", value=1)]
                drafts.append(
                    ActivityDraft(
                        item={
                            "user_id": user_id,
                            "provider": Provider.GITHUB,
                            "provider_account_id": provider_account_id,
                            "repository_id": repository_id,
                            "provider_item_id": f"pr:{pull.get('id')}:merged",
                            "type": "pr_merged",
                            "occurred_at": merged_at,
                            "repo_full_name": repo_full_name,
                            "title": pull.get("title"),
                            "number": pull.get("number"),
                            "url": pull.get("html_url"),
                            "metadata": build_metrics_metadata(merged_metrics),
                        },
                        metrics=merged_metrics,
                    )
                )

        drafts = [
            draft for draft in drafts if to_datetime(draft.item["occurred_at"]) >= since
        ]

        log_debug("pulls drafts built", {"repo_full_name": repo_full_name, "page": page, "drafts": len(drafts)})
        new_drafts = await filter_new_activity_drafts(session, user_id, drafts)
        created_count += await create_activity_items(session, new_drafts)
        log_debug(
            "pulls page processed",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "newDrafts": len(new_drafts),
                "createdTotal": created_count,
            },
        )

        for draft in new_drafts:
            for metric in draft.metrics:
                day = to_utc_date(to_datetime(draft.item["occurred_at"]))
                bucket = repo_full_name
                if include_non_scored_facts or metric.key in SCORED_METRICS:
                    add_fact_delta(fact_deltas, day, metric.key, bucket, metric.value)

        for pull in pulls:
            updated_at = to_datetime(pull.get("updated_at"))
            if not latest or updated_at > latest:
                latest = updated_at

        oldest = pulls[-1]
        if to_datetime(oldest.get("updated_at")) < since:
            log_debug(
                "pulls stop (older than since)",
                {
                    "repo_full_name": repo_full_name,
                    "page": page,
                    "oldestUpdatedAt": oldest.get("updated_at"),
                    "since": since.isoformat(),
                },
            )
            break

        if len(pulls) < DEFAULT_PER_PAGE:
            log_debug("pulls stop (last page)", {"repo_full_name": repo_full_name, "page": page})
            break

        page += 1

    if latest:
        log_debug("pulls cursor update", {"repo_full_name": repo_full_name, "latest": latest.isoformat()})
        await set_cursor_value(session, user_id, repository_id, "pulls", latest)
    elif fetched_count == 0:
        log_debug(
            "pulls cursor update (no fetch)",
            {"repo_full_name": repo_full_name, "syncStart": sync_start.isoformat()},
        )
        await set_cursor_value(session, user_id, repository_id, "pulls", sync_start)

    log_debug(
        "pulls sync complete",
        {
            "repo_full_name": repo_full_name,
            "pages": page,
            "fetched": fetched_count,
            "createdTotal": created_count,
        },
    )
    return created_count


async def sync_issues(
    session: Session,
    installation_token: str,
    repository_id: int,
    repo_full_name: str,
    owner_login: str,
    repo_name: str,
    user_id: int,
    provider_account_id: int | None,
    login: str,
    lookback_start: datetime,
    sync_start: datetime,
    fact_deltas: dict[str, FactDelta],
    include_non_scored_facts: bool,
) -> int:
    cursor = await get_cursor_value(session, user_id, repository_id, "issues")
    since = cursor or lookback_start
    log_debug(
        "issues sync start",
        {
            "user_id": user_id,
            "repository_id": repository_id,
            "repo_full_name": repo_full_name,
            "since": since.isoformat(),
            "cursor": cursor.isoformat() if cursor else None,
            "includeNonScoredFacts": include_non_scored_facts,
        },
    )
    page = 1
    latest: datetime | None = cursor
    created_count = 0
    fetched_count = 0

    while True:
        issues = await github_fetch_with_token(
            installation_token,
            f"/repos/{owner_login}/{repo_name}/issues"
            f"?state=all&since={since.isoformat()}&per_page={DEFAULT_PER_PAGE}&page={page}",
        )

        if not issues:
            log_debug("issues page empty", {"repo_full_name": repo_full_name, "page": page})
            break

        fetched_count += len(issues)
        log_debug(
            "issues page fetched",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "fetched": len(issues),
                "fetchedTotal": fetched_count,
            },
        )

        drafts: list[ActivityDraft] = []
        for issue in issues:
            if issue.get("pull_request"):
                continue
            author_login = (issue.get("user") or {}).get("login")
            if normalize_login(author_login or "") != normalize_login(login):
                continue
            created_at = to_datetime(issue.get("created_at"))
            opened_metrics = [EventMetric(key="issues_opened", value=1)]
            drafts.append(
                ActivityDraft(
                    item={
                        "user_id": user_id,
                        "provider": Provider.GITHUB,
                        "provider_account_id": provider_account_id,
                        "repository_id": repository_id,
                        "provider_item_id": f"issue:{issue.get('id')}:opened",
                        "type": "issue_opened",
                        "occurred_at": created_at,
                        "repo_full_name": repo_full_name,
                        "title": issue.get("title"),
                        "number": issue.get("number"),
                        "url": issue.get("html_url"),
                        "metadata": build_metrics_metadata(opened_metrics),
                    },
                    metrics=opened_metrics,
                )
            )

            if issue.get("closed_at"):
                closed_at = to_datetime(issue.get("closed_at"))
                closed_metrics = [EventMetric(key="issues_closed", value=1)]
                drafts.append(
                    ActivityDraft(
                        item={
                            "user_id": user_id,
                            "provider": Provider.GITHUB,
                            "provider_account_id": provider_account_id,
                            "repository_id": repository_id,
                            "provider_item_id": f"issue:{issue.get('id')}:closed",
                            "type": "issue_closed",
                            "occurred_at": closed_at,
                            "repo_full_name": repo_full_name,
                            "title": issue.get("title"),
                            "number": issue.get("number"),
                            "url": issue.get("html_url"),
                            "metadata": build_metrics_metadata(closed_metrics),
                        },
                        metrics=closed_metrics,
                    )
                )

        drafts = [
            draft for draft in drafts if to_datetime(draft.item["occurred_at"]) >= since
        ]

        log_debug("issues drafts built", {"repo_full_name": repo_full_name, "page": page, "drafts": len(drafts)})
        new_drafts = await filter_new_activity_drafts(session, user_id, drafts)
        created_count += await create_activity_items(session, new_drafts)
        log_debug(
            "issues page processed",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "newDrafts": len(new_drafts),
                "createdTotal": created_count,
            },
        )

        for draft in new_drafts:
            for metric in draft.metrics:
                day = to_utc_date(to_datetime(draft.item["occurred_at"]))
                bucket = repo_full_name
                if include_non_scored_facts or metric.key in SCORED_METRICS:
                    add_fact_delta(fact_deltas, day, metric.key, bucket, metric.value)

        for issue in issues:
            updated_at = to_datetime(issue.get("updated_at"))
            if not latest or updated_at > latest:
                latest = updated_at

        if len(issues) < DEFAULT_PER_PAGE:
            log_debug("issues stop (last page)", {"repo_full_name": repo_full_name, "page": page})
            break

        page += 1

    if latest:
        log_debug("issues cursor update", {"repo_full_name": repo_full_name, "latest": latest.isoformat()})
        await set_cursor_value(session, user_id, repository_id, "issues", latest)
    elif fetched_count == 0:
        log_debug(
            "issues cursor update (no fetch)",
            {"repo_full_name": repo_full_name, "syncStart": sync_start.isoformat()},
        )
        await set_cursor_value(session, user_id, repository_id, "issues", sync_start)

    log_debug(
        "issues sync complete",
        {
            "repo_full_name": repo_full_name,
            "pages": page,
            "fetched": fetched_count,
            "createdTotal": created_count,
        },
    )
    return created_count


async def sync_pull_request_reviews(
    session: Session,
    installation_token: str,
    repository_id: int,
    repo_full_name: str,
    owner_login: str,
    repo_name: str,
    user_id: int,
    provider_account_id: int | None,
    login: str,
    lookback_start: datetime,
    sync_start: datetime,
    fact_deltas: dict[str, FactDelta],
    include_non_scored_facts: bool,
) -> int:
    cursor = await get_cursor_value(session, user_id, repository_id, "pull_reviews")
    since = cursor or lookback_start
    log_debug(
        "reviews sync start",
        {
            "user_id": user_id,
            "repository_id": repository_id,
            "repo_full_name": repo_full_name,
            "since": since.isoformat(),
            "cursor": cursor.isoformat() if cursor else None,
            "includeNonScoredFacts": include_non_scored_facts,
        },
    )
    page = 1
    latest: datetime | None = cursor
    created_count = 0
    fetched_count = 0

    while True:
        pulls = await github_fetch_with_token(
            installation_token,
            f"/repos/{owner_login}/{repo_name}/pulls"
            f"?state=all&sort=updated&direction=desc&per_page={DEFAULT_PER_PAGE}&page={page}",
        )

        if not pulls:
            log_debug("reviews page empty", {"repo_full_name": repo_full_name, "page": page})
            break

        log_debug("reviews page fetched", {"repo_full_name": repo_full_name, "page": page, "pulls": len(pulls)})
        drafts: list[ActivityDraft] = []
        should_stop = False

        for pull in pulls:
            updated_at = to_datetime(pull.get("updated_at"))
            if updated_at < since:
                should_stop = True
                log_debug(
                    "reviews stop (pulls older than since)",
                    {
                        "repo_full_name": repo_full_name,
                        "page": page,
                        "pullNumber": pull.get("number"),
                        "updated_at": pull.get("updated_at"),
                        "since": since.isoformat(),
                    },
                )
                break

            review_page = 1
            while True:
                reviews = await github_fetch_with_token(
                    installation_token,
                    f"/repos/{owner_login}/{repo_name}/pulls/{pull.get('number')}/reviews"
                    f"?per_page={DEFAULT_PER_PAGE}&page={review_page}",
                )

                if not reviews:
                    log_debug(
                        "reviews page empty",
                        {
                            "repo_full_name": repo_full_name,
                            "pullNumber": pull.get("number"),
                            "reviewPage": review_page,
                        },
                    )
                    break

                fetched_count += len(reviews)
                log_debug(
                    "reviews fetched",
                    {
                        "repo_full_name": repo_full_name,
                        "pullNumber": pull.get("number"),
                        "reviewPage": review_page,
                        "fetched": len(reviews),
                        "fetchedTotal": fetched_count,
                    },
                )

                for review in reviews:
                    submitted_at = review.get("submitted_at")
                    if not submitted_at:
                        continue
                    reviewer_login = (review.get("user") or {}).get("login")
                    if normalize_login(reviewer_login or "") != normalize_login(login):
                        continue
                    occurred_at = to_datetime(submitted_at)
                    if occurred_at < since:
                        continue
                    metrics = [EventMetric(key="reviews", value=1)]
                    drafts.append(
                        ActivityDraft(
                            item={
                                "user_id": user_id,
                                "provider": Provider.GITHUB,
                                "provider_account_id": provider_account_id,
                                "repository_id": repository_id,
                                "provider_item_id": f"review:{review.get('id')}",
                                "type": "review",
                                "occurred_at": occurred_at,
                                "repo_full_name": repo_full_name,
                                "number": pull.get("number"),
                                "url": review.get("html_url"),
                                "metadata": build_metrics_metadata(metrics, {"pullNumber": pull.get("number")}),
                            },
                            metrics=metrics,
                        )
                    )

                if len(reviews) < DEFAULT_PER_PAGE:
                    log_debug(
                        "reviews stop (last review page)",
                        {
                            "repo_full_name": repo_full_name,
                            "pullNumber": pull.get("number"),
                            "reviewPage": review_page,
                        },
                    )
                    break

                review_page += 1

        log_debug("reviews drafts built", {"repo_full_name": repo_full_name, "page": page, "drafts": len(drafts)})
        new_drafts = await filter_new_activity_drafts(session, user_id, drafts)
        created_count += await create_activity_items(session, new_drafts)
        log_debug(
            "reviews page processed",
            {
                "repo_full_name": repo_full_name,
                "page": page,
                "newDrafts": len(new_drafts),
                "createdTotal": created_count,
            },
        )

        for draft in new_drafts:
            for metric in draft.metrics:
                day = to_utc_date(to_datetime(draft.item["occurred_at"]))
                bucket = repo_full_name
                if include_non_scored_facts or metric.key in SCORED_METRICS:
                    add_fact_delta(fact_deltas, day, metric.key, bucket, metric.value)
            occurred_at = to_datetime(draft.item["occurred_at"])
            if not latest or occurred_at > latest:
                latest = occurred_at

        if should_stop:
            break

        if len(pulls) < DEFAULT_PER_PAGE:
            log_debug("reviews stop (last pulls page)", {"repo_full_name": repo_full_name, "page": page})
            break

        page += 1

    if latest:
        log_debug("reviews cursor update", {"repo_full_name": repo_full_name, "latest": latest.isoformat()})
        await set_cursor_value(session, user_id, repository_id, "pull_reviews", latest)
    else:
        log_debug(
            "reviews cursor update (no latest)",
            {"repo_full_name": repo_full_name, "syncStart": sync_start.isoformat()},
        )
        await set_cursor_value(session, user_id, repository_id, "pull_reviews", sync_start)

    log_debug(
        "reviews sync complete",
        {
            "repo_full_name": repo_full_name,
            "pages": page,
            "fetched": fetched_count,
            "createdTotal": created_count,
        },
    )
    return created_count


async def _sync_installation_for_user(
    session: Session,
    db_user,
    provider_account: ProviderAccount | None,
    login: str,
    installation: ProviderInstallation,
) -> GithubSyncResult:
    sync_run = SyncRun(
        user_id=db_user.id,
        provider=Provider.GITHUB,
        provider_installation_id=installation.id,
        status="RUNNING",
    )
    session.add(sync_run)
    await session.commit()
    await session.refresh(sync_run)
    log_info(
        "sync run created",
        {
            "user_id": db_user.id,
            "syncRunId": sync_run.id,
            "installation_id": installation.installation_id,
        },
    )

    warnings: list[str] = []
    provider_account_id = provider_account.id if provider_account else None

    try:
        log_debug(
            "installation ready",
            {"user_id": db_user.id, "installation_id": installation.installation_id},
        )
        installation_token = await get_installation_token(installation.installation_id)
        log_debug(
            "installation token acquired",
            {"user_id": db_user.id, "installation_id": installation.installation_id},
        )

        repositories = await list_installation_repositories(installation.installation_id)
        log_debug(
            "installation repositories fetched",
            {
                "user_id": db_user.id,
                "installation_id": installation.installation_id,
                "repositories": len(repositories),
            },
        )
        repo_records = await upsert_repositories(session, installation.id, repositories)
        lookback_start = (
            add_utc_days(datetime.now(timezone.utc), -DEFAULT_LOOKBACK_DAYS)
            if DEFAULT_LOOKBACK_DAYS > 0
            else datetime.fromtimestamp(0, tz=timezone.utc)
        )
        log_debug(
            "sync lookback resolved",
            {"user_id": db_user.id, "lookbackStart": lookback_start.isoformat()},
        )

        has_non_scored_facts = (await session.exec(
            select(ActivityFactDaily.id).where(
                ActivityFactDaily.user_id == db_user.id,
                ActivityFactDaily.provider == Provider.GITHUB,
                ActivityFactDaily.metric_key.in_(NON_SCORED_METRIC_KEYS),
            )
        )).first()
        should_backfill_non_scored_facts = not bool(has_non_scored_facts)
        log_debug(
            "non-scored fact check",
            {
                "user_id": db_user.id,
                "hasNonScoredFacts": bool(has_non_scored_facts),
                "shouldBackfillNonScoredFacts": should_backfill_non_scored_facts,
            },
        )

        fact_deltas: dict[str, FactDelta] = {}
        total_items = 0
        sync_start = datetime.now(timezone.utc)
        include_non_scored_facts = not should_backfill_non_scored_facts

        log_info(
            "sync run start",
            {
                "user_id": db_user.id,
                "repos": len(repo_records),
                "fullSync": DEFAULT_LOOKBACK_DAYS == 0,
                "includeNonScoredFacts": include_non_scored_facts,
                "syncStart": sync_start.isoformat(),
            },
        )

        for repo in repo_records:
            log_debug(
                "repo sync start",
                {
                    "user_id": db_user.id,
                    "repository_id": repo["id"],
                    "repo_full_name": repo["full_name"],
                },
            )

            sync_tasks = [
                ("commits", sync_commits, "commits"),
                ("pull requests", sync_pull_requests, "pulls"),
                ("issues", sync_issues, "issues"),
                ("reviews", sync_pull_request_reviews, "pull_reviews"),
            ]

            for label, fn, cursor_key in sync_tasks:
                log_debug(
                    "task start",
                    {
                        "user_id": db_user.id,
                        "repo_full_name": repo["full_name"],
                        "task": label,
                    },
                )
                try:
                    created = await fn(
                        session,
                        installation_token,
                        repo["id"],
                        repo["full_name"],
                        repo["owner_login"],
                        repo["name"],
                        db_user.id,
                        provider_account_id,
                        login,
                        lookback_start,
                        sync_start,
                        fact_deltas,
                        include_non_scored_facts,
                    )
                    total_items += created
                    log_debug(
                        "task complete",
                        {
                            "user_id": db_user.id,
                            "repo_full_name": repo["full_name"],
                            "task": label,
                            "createdItems": created,
                            "totalItems": total_items,
                        },
                    )
                except Exception as error:
                    if is_permission_error(error):
                        warnings.append(f"{repo['full_name']} - {label}")
                        log_warn(
                            "task skipped (permission)",
                            {
                                "user_id": db_user.id,
                                "repo_full_name": repo["full_name"],
                                "task": label,
                                "error": str(error),
                            },
                        )
                        continue
                    if is_ignorable_error(error):
                        await set_cursor_value(
                            session,
                            db_user.id,
                            repo["id"],
                            cursor_key,
                            sync_start,
                        )
                        log_debug(
                            "task skipped (empty repo)",
                            {
                                "user_id": db_user.id,
                                "repo_full_name": repo["full_name"],
                                "task": label,
                            },
                        )
                        continue
                    log_error(
                        "task failed",
                        {
                            "user_id": db_user.id,
                            "repo_full_name": repo["full_name"],
                            "task": label,
                            "error": str(error),
                        },
                    )
                    raise

        if should_backfill_non_scored_facts:
            backfilled = await backfill_non_scored_facts(session, db_user.id, fact_deltas)
            if backfilled:
                log_debug(
                    "backfill non-scored applied",
                    {"user_id": db_user.id, "backfilled": backfilled},
                )

        has_scored_deltas = any(
            delta.metric_key in SCORED_METRICS for delta in fact_deltas.values()
        )
        facts = await upsert_facts(
            session,
            db_user.id,
            provider_account_id,
            list(fact_deltas.values()),
        )
        sync_time = datetime.now(timezone.utc)

        log_debug("facts upserted", {"user_id": db_user.id, "facts": facts})
        installation.last_synced_at = sync_time
        session.add(installation)
        await session.commit()

        log_debug(
            "installation last_synced_at updated",
            {
                "user_id": db_user.id,
                "installation_id": installation.installation_id,
                "last_synced_at": sync_time.isoformat(),
            },
        )

        period = resolve_score_period("monthly")
        base_windows = collect_score_windows(
            period,
            [datetime.now(timezone.utc)] + [
                datetime.combine(delta.day, datetime.min.time(), tzinfo=timezone.utc)
                for delta in fact_deltas.values()
            ],
        )
        windows_by_key = {window.start.isoformat(): window for window in base_windows}
        log_debug("score windows seeded", {"user_id": db_user.id, "windows": len(base_windows)})

        earliest_fact = (await session.exec(
            select(func.min(ActivityFactDaily.day)).where(
                ActivityFactDaily.user_id == db_user.id,
                ActivityFactDaily.provider == Provider.GITHUB,
            )
        )).one()
        earliest_fact_day = scalar_value(earliest_fact)
        log_debug(
            "earliest fact resolved",
            {
                "user_id": db_user.id,
                "earliestFact": earliest_fact_day.isoformat() if earliest_fact_day else None,
            },
        )

        if earliest_fact_day:
            earliest_snapshot = (await session.exec(
                select(ScoreSnapshot.period_start)
                .where(
                    ScoreSnapshot.user_id == db_user.id,
                    ScoreSnapshot.period == period,
                )
                .order_by(ScoreSnapshot.period_start.asc())
            )).first()
            earliest_snapshot = scalar_value(earliest_snapshot)
            fact_start = to_utc_month_start(
                datetime.combine(
                    earliest_fact_day,
                    datetime.min.time(),
                    tzinfo=timezone.utc,
                )
            )
            snapshot_start = (
                to_utc_month_start(
                    datetime.combine(
                        earliest_snapshot,
                        datetime.min.time(),
                        tzinfo=timezone.utc,
                    )
                )
                if earliest_snapshot
                else None
            )
            log_debug(
                "snapshot backfill check",
                {
                    "user_id": db_user.id,
                    "factStart": fact_start.isoformat(),
                    "snapshotStart": snapshot_start.isoformat() if snapshot_start else None,
                },
            )

            if not snapshot_start or snapshot_start > fact_start:
                backfill_windows = collect_score_windows_for_range(
                    period, fact_start, datetime.now(timezone.utc)
                )
                log_debug(
                    "snapshot backfill windows",
                    {"user_id": db_user.id, "windows": len(backfill_windows)},
                )
                for window in backfill_windows:
                    windows_by_key[window.start.isoformat()] = window

        windows = sorted(windows_by_key.values(), key=lambda window: window.start)
        if windows:
            log_debug(
                "snapshot refresh start",
                {"user_id": db_user.id, "windows": len(windows)},
            )

        for window in windows:
            summary = await get_activity_summary_for_period(session, db_user.id, window)
            log_debug(
                "snapshot window summary",
                {
                    "user_id": db_user.id,
                    "windowStart": window.start.isoformat(),
                    "windowEnd": window.end.isoformat(),
                    "hasScoredData": summary.has_scored_data,
                    "hasData": summary.has_data,
                    "activeDays": summary.active_days,
                    "totals": summary.totals,
                },
            )
            await refresh_score_snapshot_for_period(session, db_user.id, window, summary)

        sync_run.status = "SUCCESS"
        sync_run.finished_at = sync_time
        sync_run.repos = len(repo_records)
        sync_run.items = total_items
        sync_run.facts = facts
        sync_run.warnings = len(warnings)
        session.add(sync_run)
        await session.commit()

        if has_scored_deltas:
            from services.sync_scheduler import enqueue_leaderboard_refresh

            for period in ("daily", "weekly", "monthly"):
                await enqueue_leaderboard_refresh(period)

        if warnings:
            log_warn("sync warnings", {"user_id": db_user.id, "warnings": len(warnings)})

        log_info(
            "sync run success",
            {
                "user_id": db_user.id,
                "syncRunId": sync_run.id,
                "repos": len(repo_records),
                "items": total_items,
                "facts": facts,
                "warnings": len(warnings),
            },
        )
        return GithubSyncResult(
            ok=True,
            error=None,
            repos=len(repo_records),
            items=total_items,
            facts=facts,
            last_synced_at=sync_time.isoformat(),
            warnings=warnings or None,
            sync_run_id=sync_run.id,
        )
    except Exception as error:
        message = str(error) or "Sync failed."
        if is_installation_not_found(error):
            message = (
                "GitHub App installation not found. "
                "Reinstall the app or verify GitHub App credentials."
            )
            log_warn(
                "sync blocked (installation not found)",
                {
                    "user_id": db_user.id,
                    "installation_id": installation.installation_id,
                    "error": str(error),
                },
            )
            sync_run.status = "FAILED"
            sync_run.finished_at = datetime.now(timezone.utc)
            sync_run.error = message
            sync_run.warnings = len(warnings)
            sync_run.provider_installation_id = None
            session.add(sync_run)
            user_ids = await get_provider_installation_user_ids(
                session, installation.id
            )
            counts = await purge_installation_data(session, installation, user_ids)
            await session.delete(installation)
            await session.commit()
            log_warn(
                "installation data purged due to 404",
                {
                    "user_id": user_ids,
                    "installation_id": installation.installation_id,
                    **counts,
                },
            )
            return GithubSyncResult(
                ok=False,
                error=message,
                repos=0,
                items=0,
                facts=0,
                warnings=warnings or None,
                sync_run_id=sync_run.id,
            )
        log_error(
            "sync run failed",
            {"user_id": db_user.id, "syncRunId": sync_run.id, "error": message},
        )
        sync_run.status = "FAILED"
        sync_run.finished_at = datetime.now(timezone.utc)
        sync_run.error = message
        sync_run.warnings = len(warnings)
        session.add(sync_run)
        await session.commit()
        raise


async def sync_github_for_clerk_user(
    session: Session,
    clerk_id: str,
    clerk_user: ClerkProfile | None = None,
    *,
    installation_id: str | None = None,
) -> GithubSyncResult:
    normalized_installation_id = (
        installation_id.strip() if isinstance(installation_id, str) else None
    )
    log_info(
        "sync start",
        {
            "clerk_id": clerk_id,
            "hasClerkUser": bool(clerk_user),
            "installation_id": normalized_installation_id,
        },
    )
    if clerk_user:
        db_user = await ensure_user_from_clerk(session, clerk_user)
    else:
        db_user = await get_or_create_user_by_clerk_id(session, clerk_id)

    if not db_user:
        log_error("sync failed (user not found)", {"clerk_id": clerk_id})
        return GithubSyncResult(
            ok=False,
            error="User not found.",
            repos=0,
            items=0,
            facts=0,
        )

    provider_account = await get_provider_account(session, db_user.id, Provider.GITHUB)
    log_debug(
        "provider account resolved",
        {
            "user_id": db_user.id,
            "provider_account_id": provider_account.id if provider_account else None,
            "status": provider_account.status if provider_account else None,
            "provider_username": provider_account.provider_username if provider_account else None,
            "provider_user_id": provider_account.provider_user_id if provider_account else None,
        },
    )
    login = None
    if provider_account and provider_account.status == ProviderStatus.ACTIVE:
        login = provider_account.provider_username or provider_account.provider_user_id
        if provider_account.provider_username:
            await link_org_installations_for_user(
                session,
                db_user.id,
                provider_account.provider_username,
            )

    if not login:
        log_warn("sync blocked (no login)", {"user_id": db_user.id})
        return GithubSyncResult(
            ok=False,
            error="GitHub sign-in required.",
            repos=0,
            items=0,
            facts=0,
        )

    installations = [
        installation
        for installation in await get_provider_installations_for_user(session, db_user.id)
        if installation.provider == Provider.GITHUB
    ]
    if normalized_installation_id:
        filtered = [
            installation
            for installation in installations
            if installation.installation_id == normalized_installation_id
        ]
        if not filtered:
            try:
                installation_pk = int(normalized_installation_id)
            except (TypeError, ValueError):
                installation_pk = None
            if installation_pk is not None:
                filtered = [
                    installation
                    for installation in installations
                    if installation.id == installation_pk
                ]
        installations = filtered

    if not installations:
        reason = "no installation"
        error_message = "Install the GitHub App to sync."
        if normalized_installation_id:
            reason = "installation not linked"
            error_message = "Installation not linked to this account."
        log_warn(
            f"sync blocked ({reason})",
            {"user_id": db_user.id, "installation_id": normalized_installation_id},
        )
        return GithubSyncResult(
            ok=False,
            error=error_message,
            repos=0,
            items=0,
            facts=0,
        )

    results: list[GithubSyncResult] = []
    for installation in installations:
        result = await _sync_installation_for_user(
            session,
            db_user,
            provider_account,
            login,
            installation,
        )
        results.append(result)

    ok = all(result.ok for result in results)
    error = next((result.error for result in results if not result.ok), None)
    repos = sum(result.repos for result in results)
    items = sum(result.items for result in results)
    facts = sum(result.facts for result in results)
    warnings: list[str] = []
    for result in results:
        if result.warnings:
            warnings.extend(result.warnings)

    last_synced_at = None
    for result in results:
        if not result.last_synced_at:
            continue
        if not last_synced_at:
            last_synced_at = result.last_synced_at
            continue
        if to_datetime(result.last_synced_at) > to_datetime(last_synced_at):
            last_synced_at = result.last_synced_at

    sync_run_id = None
    for result in reversed(results):
        if result.sync_run_id is not None:
            sync_run_id = result.sync_run_id
            break

    return GithubSyncResult(
        ok=ok,
        error=error,
        repos=repos,
        items=items,
        facts=facts,
        last_synced_at=last_synced_at,
        warnings=warnings or None,
        sync_run_id=sync_run_id,
    )
