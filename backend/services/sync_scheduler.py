from __future__ import annotations

import hashlib
import os
import socket
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Iterable

import anyio
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Connection
from sqlmodel import select
from database import async_session, sync_engine
from integrations.registry import get_provider_adapter
from models import Provider, Task, TaskStatus, User
from services.leaderboards import (
    clear_leaderboard_cache,
    get_leaderboard_country_scopes,
    get_leaderboard_language_scopes,
    get_leaderboard_window,
    refresh_leaderboard_entries_for_window,
)
from services.logger import AppLogger
from services.github_webhooks import GithubInstallationEvent, process_installation_event

logger = AppLogger.get_logger(__name__)


class TaskNonRetryableError(RuntimeError):
    pass

_SCHEDULER: AsyncIOScheduler | None = None
_SCHEDULER_DB_LOCK: Connection | None = None
_FANOUT_JOB_ID = "sync-fanout"
_TASK_WORKER_JOB_ID = "task-worker"
_DAILY_LEADERBOARD_JOB_ID = "leaderboard-daily"
_WEEKLY_LEADERBOARD_JOB_ID = "leaderboard-weekly"
_MONTHLY_LEADERBOARD_JOB_ID = "leaderboard-monthly"
_JOBSTORE_PERSISTED = "default"
_JOBSTORE_EPHEMERAL = "ephemeral"
_TASK_TYPE_PROVIDER_SYNC = "provider_sync"
_TASK_TYPE_GITHUB_WEBHOOK = "github_webhook"
_TASK_TYPE_LEADERBOARD_REFRESH = "leaderboard_refresh"
_POSTGRES_DIALECTS = {"postgresql"}
_SCHEDULER_DB_LOCK_KEY = int.from_bytes(
    hashlib.sha256(b"git-rank-scheduler").digest()[:8],
    "big",
) & ((1 << 63) - 1)


def _acquire_db_scheduler_lock() -> bool:
    global _SCHEDULER_DB_LOCK
    if sync_engine.dialect.name not in _POSTGRES_DIALECTS:
        raise RuntimeError(
            f"Scheduler lock requires PostgreSQL, got '{sync_engine.dialect.name}'."
        )
    if _SCHEDULER_DB_LOCK is not None:
        return True

    conn = sync_engine.connect()
    try:
        result = conn.execute(
            text("SELECT pg_try_advisory_lock(:key)"),
            {"key": _SCHEDULER_DB_LOCK_KEY},
        ).scalar()
        conn.commit()
    except Exception:
        conn.close()
        raise

    if result:
        _SCHEDULER_DB_LOCK = conn
        return True

    conn.close()
    return False


def _release_db_scheduler_lock() -> None:
    global _SCHEDULER_DB_LOCK
    if _SCHEDULER_DB_LOCK is None:
        return

    try:
        _SCHEDULER_DB_LOCK.execute(
            text("SELECT pg_advisory_unlock(:key)"),
            {"key": _SCHEDULER_DB_LOCK_KEY},
        )
        _SCHEDULER_DB_LOCK.commit()
    finally:
        _SCHEDULER_DB_LOCK.close()
        _SCHEDULER_DB_LOCK = None


def _acquire_scheduler_lock() -> bool:
    return _acquire_db_scheduler_lock()


def _release_scheduler_lock() -> None:
    _release_db_scheduler_lock()


async def init_scheduler(
    interval_seconds: int,
    max_concurrent: int,
    *,
    leaderboard_daily_interval_seconds: int = 3600,
    leaderboard_weekly_interval_seconds: int = 3600,
    leaderboard_monthly_interval_seconds: int = 3600,
    task_worker_interval_seconds: int = 10,
    task_worker_batch_size: int = 10,
    task_worker_lease_seconds: int = 3600,
    task_worker_concurrency: int | None = None,
) -> tuple[AsyncIOScheduler, bool]:
    is_leader = await anyio.to_thread.run_sync(_acquire_scheduler_lock)
    try:
        if is_leader:
            await requeue_running_tasks()
        scheduler = build_scheduler(
            interval_seconds,
            max_concurrent,
            schedule_periodic=is_leader,
            task_worker_interval_seconds=task_worker_interval_seconds,
            task_worker_batch_size=task_worker_batch_size,
            task_worker_lease_seconds=task_worker_lease_seconds,
            task_worker_concurrency=task_worker_concurrency,
            leaderboard_daily_interval_seconds=leaderboard_daily_interval_seconds,
            leaderboard_weekly_interval_seconds=leaderboard_weekly_interval_seconds,
            leaderboard_monthly_interval_seconds=leaderboard_monthly_interval_seconds,
        )
    except Exception:
        _release_scheduler_lock()
        raise
    try:
        scheduler.start(paused=not is_leader)
    except Exception:
        _release_scheduler_lock()
        raise
    if is_leader:
        logger.info("scheduler started")
    else:
        logger.warning("scheduler started paused (lock not acquired)")
    return scheduler, is_leader


async def shutdown_scheduler(scheduler: AsyncIOScheduler | None) -> None:
    if scheduler:
        scheduler.shutdown(wait=True)
    await anyio.to_thread.run_sync(_release_scheduler_lock)


def _scalar_values(rows: Iterable[object]) -> list[str]:
    values: list[str] = []
    for row in rows:
        if isinstance(row, tuple):
            row = row[0]
        if isinstance(row, str):
            values.append(row)
    return values


async def _get_all_clerk_ids() -> list[str]:
    statement = select(User.clerk_id)
    async with async_session() as session:
        rows = (await session.exec(statement)).all()
        return _scalar_values(rows)


async def run_provider_sync(
    provider: str,
    clerk_id: str,
    installation_id: str | None = None,
):
    adapter = get_provider_adapter(provider)
    async with async_session() as session:
        logger.info(
            "sync job start",
            extra={
                "provider": provider,
                "user_id": clerk_id,
                "installation_id": installation_id,
            },
        )
        try:
            result = await adapter.sync(
                session,
                clerk_id,
                None,
                installation_id=installation_id,
            )
        except Exception:
            logger.exception(
                "sync job failed",
                extra={
                    "provider": provider,
                    "user_id": clerk_id,
                    "installation_id": installation_id,
                },
            )
            raise
        logger.info(
            "sync job complete",
            extra={
                "provider": provider,
                "user_id": clerk_id,
                "installation_id": installation_id,
                "ok": result.ok,
                "error": result.error,
                "repos": result.repos,
                "items": result.items,
                "facts": result.facts,
                "warnings": len(result.warnings or []),
                "sync_run_id": result.sync_run_id,
            },
        )
        return result


async def run_github_webhook_event(event_data: dict[str, Any]) -> dict[str, Any]:
    event = GithubInstallationEvent.from_dict(event_data)
    async with async_session() as session:
        try:
            logger.info(
                "github webhook start event_type=%s action=%s installation_id=%s account_login=%s account_type=%s account_id=%s",
                event.event_type,
                event.action,
                event.installation_id,
                event.account_login or None,
                event.account_type,
                event.account_id,
                extra={
                    "event_type": event.event_type,
                    "action": event.action,
                    "installation_id": event.installation_id,
                    "account_login": event.account_login or None,
                    "account_type": event.account_type,
                    "account_id": event.account_id,
                },
            )
            ok, status, message, linked_user_ids = await process_installation_event(
                session,
                event,
            )
            logger.info(
                "github webhook processed event_type=%s action=%s installation_id=%s status=%s ok=%s user_id=%s detail=%s",
                event.event_type,
                event.action,
                event.installation_id,
                status,
                ok,
                linked_user_ids,
                message,
                extra={
                    "event_type": event.event_type,
                    "action": event.action,
                    "installation_id": event.installation_id,
                    "account_login": event.account_login or None,
                    "account_type": event.account_type,
                    "account_id": event.account_id,
                    "ok": ok,
                    "status": status,
                    "detail": message,
                    "user_id": linked_user_ids,
                },
            )
            if status == "linked" and linked_user_ids:
                for linked_user_id in linked_user_ids:
                    clerk_id = (await session.exec(
                        select(User.clerk_id).where(User.id == linked_user_id)
                    )).first()
                    if isinstance(clerk_id, tuple):
                        clerk_id = clerk_id[0]
                    if isinstance(clerk_id, str) and clerk_id:
                        await _enqueue_provider_sync(
                            Provider.GITHUB.value,
                            clerk_id,
                            datetime.now(timezone.utc),
                            installation_id=event.installation_id or None,
                        )
                        logger.info(
                            "sync queued from webhook provider=%s user_id=%s clerk_id=%s installation_id=%s",
                            Provider.GITHUB.value,
                            linked_user_id,
                            clerk_id,
                            event.installation_id,
                            extra={
                                "provider": Provider.GITHUB.value,
                                "user_id": linked_user_id,
                                "clerk_id": clerk_id,
                                "installation_id": event.installation_id,
                            },
                        )
                    else:
                        logger.warning(
                            "sync enqueue skipped (missing clerk id) user_id=%s installation_id=%s",
                            linked_user_id,
                            event.installation_id,
                            extra={
                                "user_id": linked_user_id,
                                "installation_id": event.installation_id,
                            },
                        )
            return {
                "ok": ok,
                "status": status,
                "message": message,
                "user_id": linked_user_ids,
                "event_type": event.event_type,
                "action": event.action,
            }
        except Exception:
            logger.exception(
                "github webhook failed event_type=%s action=%s installation_id=%s account_login=%s account_type=%s account_id=%s",
                event.event_type,
                event.action,
                event.installation_id,
                event.account_login or None,
                event.account_type,
                event.account_id,
                extra={
                    "event_type": event.event_type,
                    "action": event.action,
                    "installation_id": event.installation_id,
                    "account_login": event.account_login or None,
                    "account_type": event.account_type,
                    "account_id": event.account_id,
                },
            )
            raise


async def _get_user_id_for_clerk_id(clerk_id: str) -> int | None:
    statement = select(User.id).where(User.clerk_id == clerk_id)
    async with async_session() as session:
        result = (await session.exec(statement)).first()
        if isinstance(result, tuple):
            result = result[0]
        return int(result) if result is not None else None


async def _queue_task(
    *,
    task_type: str,
    run_after: datetime,
    payload: dict[str, Any],
    dedupe_key: str | None = None,
    user_id: int | None = None,
    priority: int = 0,
    max_attempts: int = 5,
) -> bool:
    now = datetime.now(timezone.utc)
    values = {
        "task_type": task_type,
        "status": TaskStatus.PENDING,
        "user_id": user_id,
        "dedupe_key": dedupe_key,
        "priority": priority,
        "run_after": run_after,
        "payload": payload,
        "max_attempts": max_attempts,
    }
    async with async_session() as session:
        if dedupe_key is None:
            task = Task(**values)
            session.add(task)
            await session.commit()
            return True

        stmt = pg_insert(Task).values(**values)
        terminal_statuses = [TaskStatus.SUCCEEDED, TaskStatus.FAILED, TaskStatus.CANCELLED]
        stmt = stmt.on_conflict_do_update(
            index_elements=["task_type", "dedupe_key"],
            set_={
                "status": TaskStatus.PENDING,
                "run_after": run_after,
                "locked_until": None,
                "locked_by": None,
                "started_at": None,
                "finished_at": None,
                "error": None,
                "result": None,
                "attempts": 0,
                "payload": payload,
                "user_id": user_id,
                "priority": priority,
                "max_attempts": max_attempts,
                "updated_at": now,
            },
            where=Task.status.in_(terminal_statuses),
        )
        result = await session.exec(stmt)
        await session.commit()
        return result.rowcount > 0


async def _enqueue_provider_sync(
    provider: str,
    clerk_id: str,
    run_date: datetime,
    *,
    installation_id: str | None = None,
) -> None:
    dedupe_key = f"{provider}:{clerk_id}"
    if installation_id:
        dedupe_key = f"{dedupe_key}:{installation_id}"
    user_id = await _get_user_id_for_clerk_id(clerk_id)
    payload: dict[str, Any] = {"provider": provider, "clerk_id": clerk_id}
    if installation_id:
        payload["installation_id"] = installation_id
    created = await _queue_task(
        task_type=_TASK_TYPE_PROVIDER_SYNC,
        run_after=run_date,
        payload=payload,
        dedupe_key=dedupe_key,
        user_id=user_id,
    )
    if not created:
        logger.info(
            "sync task already queued",
            extra={"provider": provider, "user_id": clerk_id},
        )


async def enqueue_provider_sync(
    provider: str,
    clerk_id: str,
    *,
    installation_id: str | None = None,
    run_date: datetime | None = None,
) -> None:
    if _SCHEDULER is None:
        logger.error(
            "scheduler not initialized for sync enqueue",
            extra={"provider": provider, "user_id": clerk_id},
        )
        raise RuntimeError("Scheduler not initialized for provider sync.")

    if run_date is None:
        run_date = datetime.now(timezone.utc)

    await _enqueue_provider_sync(
        provider,
        clerk_id,
        run_date,
        installation_id=installation_id,
    )


async def enqueue_github_webhook_event(
    event_data: dict[str, Any],
    *,
    delivery_id: str | None = None,
    run_date: datetime | None = None,
) -> None:
    if _SCHEDULER is None:
        logger.error("scheduler not initialized for webhook enqueue")
        raise RuntimeError("Scheduler not initialized for webhook enqueue.")

    if run_date is None:
        run_date = datetime.now(timezone.utc)

    created = await _queue_task(
        task_type=_TASK_TYPE_GITHUB_WEBHOOK,
        run_after=run_date,
        payload={"event_data": event_data, "delivery_id": delivery_id},
        dedupe_key=delivery_id,
    )
    if not created:
        logger.info(
            "webhook task already queued",
            extra={"delivery_id": delivery_id},
        )


async def enqueue_leaderboard_refresh(
    period: str,
    *,
    run_date: datetime | None = None,
) -> None:
    normalized = period.strip().lower()
    if normalized not in {"daily", "weekly", "monthly"}:
        logger.error(
            "invalid leaderboard period for enqueue",
            extra={"period": period},
        )
        return
    if _SCHEDULER is None:
        logger.warning(
            "scheduler not initialized for leaderboard enqueue",
            extra={"period": normalized},
        )
        return
    if run_date is None:
        run_date = datetime.now(timezone.utc)
    created = await _queue_task(
        task_type=_TASK_TYPE_LEADERBOARD_REFRESH,
        run_after=run_date,
        payload={"period": normalized},
        dedupe_key=normalized,
    )
    if not created:
        logger.info(
            "leaderboard refresh task already queued",
            extra={"period": normalized},
        )


async def enqueue_sync_jobs(provider: str = Provider.GITHUB.value) -> None:
    if _SCHEDULER is None:
        logger.warning("scheduler not initialized for sync fanout")
        return

    clerk_ids = await _get_all_clerk_ids()
    if not clerk_ids:
        logger.info("scheduled sync fanout skipped (no users)", extra={"provider": provider})
        return

    run_date = datetime.now(timezone.utc)
    for clerk_id in clerk_ids:
        await _enqueue_provider_sync(provider, clerk_id, run_date)


def _compute_task_backoff(attempts: int) -> int:
    return min(300, max(30, attempts * 30))


async def requeue_running_tasks() -> int:
    now = datetime.now(timezone.utc)
    statement = (
        update(Task)
        .where(
            Task.status == TaskStatus.RUNNING,
            Task.finished_at.is_(None),
        )
        .values(
            status=TaskStatus.PENDING,
            run_after=now,
            locked_until=None,
            locked_by=None,
            started_at=None,
            finished_at=None,
            error=None,
            result=None,
            updated_at=now,
        )
    )
    async with async_session() as session:
        result = await session.exec(statement)
        await session.commit()
    rowcount = int(getattr(result, "rowcount", 0) or 0)
    if rowcount:
        logger.warning(
            "running tasks requeued after startup",
            extra={"count": rowcount},
        )
    return rowcount


async def _claim_tasks(
    *,
    batch_size: int,
    lease_seconds: int,
    locked_by: str,
) -> list[dict[str, Any]]:
    if batch_size <= 0:
        return []

    query = text(
        """
        WITH cte AS (
            SELECT id
            FROM task
            WHERE status IN ('PENDING', 'RUNNING')
              AND run_after <= now()
              AND (locked_until IS NULL OR locked_until < now())
              AND attempts < max_attempts
            ORDER BY priority DESC, run_after ASC, id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT :limit
        )
        UPDATE task
        SET status = 'RUNNING',
            locked_until = now() + (:lease_seconds || ' seconds')::interval,
            locked_by = :locked_by,
            started_at = now(),
            updated_at = now(),
            attempts = attempts + 1
        WHERE id IN (SELECT id FROM cte)
        RETURNING id, task_type, status, user_id, dedupe_key, priority, run_after,
                  locked_until, locked_by, attempts, max_attempts, started_at,
                  finished_at, payload, result, error
        """
    )
    async with async_session() as session:
        rows = (
            (await session.exec(
                query,
                params={
                    "limit": batch_size,
                    "lease_seconds": lease_seconds,
                    "locked_by": locked_by,
                },
            ))
            .mappings()
            .all()
        )
        await session.commit()
    return [dict(row) for row in rows]


async def _mark_task_success(task_id: int, result: dict[str, Any] | None) -> None:
    async with async_session() as session:
        task = await session.get(Task, task_id)
        if task is None:
            logger.warning("task not found for success update", extra={"task_id": task_id})
            return
        task.status = TaskStatus.SUCCEEDED
        task.finished_at = datetime.now(timezone.utc)
        task.locked_until = None
        task.locked_by = None
        task.error = None
        task.result = result
        session.add(task)
        await session.commit()


async def _mark_task_failure(
    task: dict[str, Any],
    *,
    error: str,
    retry: bool,
) -> None:
    task_id = int(task["id"])
    attempts = int(task.get("attempts") or 0)
    max_attempts = int(task.get("max_attempts") or 0)
    should_retry = retry and attempts < max_attempts
    next_run = datetime.now(timezone.utc)
    if should_retry:
        next_run += timedelta(seconds=_compute_task_backoff(attempts))

    async with async_session() as session:
        record = await session.get(Task, task_id)
        if record is None:
            logger.warning("task not found for failure update", extra={"task_id": task_id})
            return
        record.status = TaskStatus.PENDING if should_retry else TaskStatus.FAILED
        record.run_after = next_run
        record.finished_at = datetime.now(timezone.utc)
        record.locked_until = None
        record.locked_by = None
        record.error = error
        session.add(record)
        await session.commit()


async def _execute_task(task: dict[str, Any]) -> None:
    task_id = int(task["id"])
    task_type = task.get("task_type")
    payload = task.get("payload") or {}
    try:
        if task_type == _TASK_TYPE_PROVIDER_SYNC:
            if not isinstance(payload, dict):
                raise TaskNonRetryableError("Invalid task payload.")
            provider = payload.get("provider")
            clerk_id = payload.get("clerk_id")
            if not isinstance(provider, str) or not isinstance(clerk_id, str):
                raise TaskNonRetryableError("Missing provider sync payload.")
            installation_id = payload.get("installation_id")
            if isinstance(installation_id, str):
                installation_id = installation_id.strip() or None
            elif installation_id is not None:
                raise TaskNonRetryableError("Invalid installation id.")
            result = await run_provider_sync(provider, clerk_id, installation_id)
            if not result.ok:
                raise TaskNonRetryableError(result.error or "Sync failed.")
            await _mark_task_success(task_id, result=result.to_dict())
            return

        if task_type == _TASK_TYPE_GITHUB_WEBHOOK:
            if not isinstance(payload, dict):
                raise TaskNonRetryableError("Invalid task payload.")
            event_data = payload.get("event_data")
            if not isinstance(event_data, dict):
                raise TaskNonRetryableError("Missing webhook payload.")
            result = await run_github_webhook_event(event_data)
            if not result.get("ok", True):
                raise TaskNonRetryableError(result.get("message") or "Webhook failed.")
            await _mark_task_success(task_id, result=result)
            return

        if task_type == _TASK_TYPE_LEADERBOARD_REFRESH:
            if not isinstance(payload, dict):
                raise TaskNonRetryableError("Invalid task payload.")
            period = payload.get("period")
            if not isinstance(period, str):
                raise TaskNonRetryableError("Missing leaderboard period.")
            await _run_leaderboard_refresh(period)
            await _mark_task_success(task_id, result={"ok": True, "period": period})
            return

        raise TaskNonRetryableError(f"Unknown task type '{task_type}'.")
    except TaskNonRetryableError as exc:
        logger.warning(
            "task failed (non-retryable)",
            extra={"task_id": task_id, "task_type": task_type, "error": str(exc)},
        )
        await _mark_task_failure(task, error=str(exc), retry=False)
    except Exception as exc:
        logger.exception(
            "task failed",
            extra={"task_id": task_id, "task_type": task_type},
        )
        await _mark_task_failure(task, error=str(exc) or "Task failed.", retry=True)


async def run_task_worker(
    batch_size: int,
    lease_seconds: int,
    max_concurrent: int = 1,
) -> None:
    locked_by = f"{socket.gethostname()}:{os.getpid()}"
    tasks = await _claim_tasks(
        batch_size=batch_size,
        lease_seconds=lease_seconds,
        locked_by=locked_by,
    )
    if not tasks:
        return
    resolved_concurrency = max(1, int(max_concurrent or 1))
    resolved_concurrency = min(resolved_concurrency, len(tasks))
    logger.info(
        "task worker claimed tasks",
        extra={"count": len(tasks), "concurrency": resolved_concurrency},
    )
    if resolved_concurrency <= 1:
        for task in tasks:
            await _execute_task(task)
        return

    limiter = anyio.Semaphore(resolved_concurrency)

    async def run_task(task: dict[str, Any]) -> None:
        await limiter.acquire()
        try:
            await _execute_task(task)
        finally:
            limiter.release()

    async with anyio.create_task_group() as task_group:
        for task in tasks:
            task_group.start_soon(run_task, task)


async def _run_leaderboard_refresh(period: str) -> None:
    window = get_leaderboard_window(period)
    async with async_session() as session:
        try:
            scopes: list[tuple[str, dict[str, object] | None]] = [("global", None)]
            scopes.extend(await get_leaderboard_language_scopes(session))
            scopes.extend(await get_leaderboard_country_scopes(session))
            unique_scopes: list[tuple[str, dict[str, object] | None]] = []
            seen: set[str] = set()
            for scope_value, metadata in scopes:
                if scope_value in seen:
                    continue
                unique_scopes.append((scope_value, metadata))
                seen.add(scope_value)
            total_entries = 0
            failures = 0
            for scope, scope_metadata in unique_scopes:
                try:
                    entries = await refresh_leaderboard_entries_for_window(
                        session,
                        window,
                        scope=scope,
                        scope_metadata=scope_metadata,
                    )
                    total_entries += len(entries)
                except Exception:
                    failures += 1
                    logger.exception(
                        "%s leaderboard scope refresh failed",
                        period,
                        extra={
                            "period_start": window.start.date().isoformat(),
                            "scope": scope,
                        },
                    )
            cache_cleared = await clear_leaderboard_cache()
            logger.info(
                "%s leaderboard refreshed",
                period,
                extra={
                    "period_start": window.start.date().isoformat(),
                    "period_end": window.end.date().isoformat(),
                    "entries": total_entries,
                    "scopes": len(unique_scopes),
                    "failures": failures,
                    "cache_list_cleared": cache_cleared["list"],
                    "cache_scope_cleared": cache_cleared["scope"],
                },
            )
        except Exception:
            logger.exception(
                "%s leaderboard refresh failed",
                period,
                extra={"period_start": window.start.date().isoformat()},
            )


async def run_daily_leaderboard_refresh() -> None:
    await _run_leaderboard_refresh("daily")


async def run_weekly_leaderboard_refresh() -> None:
    await _run_leaderboard_refresh("weekly")


async def run_monthly_leaderboard_refresh() -> None:
    await _run_leaderboard_refresh("monthly")


def _schedule_interval_job(
    scheduler: AsyncIOScheduler,
    *,
    job_id: str,
    func: Callable[[], Awaitable[Any]],
    interval_seconds: int,
) -> None:
    interval = max(60, interval_seconds)
    scheduler.add_job(
        func,
        trigger=IntervalTrigger(seconds=interval),
        id=job_id,
        replace_existing=True,
        jobstore=_JOBSTORE_PERSISTED,
        misfire_grace_time=max(60, interval // 2),
    )


def _schedule_task_worker(
    scheduler: AsyncIOScheduler,
    *,
    interval_seconds: int,
    batch_size: int,
    lease_seconds: int,
    max_instances: int = 1,
    task_concurrency: int = 1,
) -> None:
    interval = max(1, interval_seconds)
    scheduler.add_job(
        run_task_worker,
        trigger=IntervalTrigger(seconds=interval),
        id=_TASK_WORKER_JOB_ID,
        replace_existing=True,
        jobstore=_JOBSTORE_PERSISTED,
        args=[batch_size, lease_seconds, task_concurrency],
        misfire_grace_time=max(10, interval // 2),
        max_instances=max(1, max_instances),
    )


def _schedule_periodic_jobs(
    scheduler: AsyncIOScheduler,
    *,
    sync_interval_seconds: int,
    task_worker_interval_seconds: int,
    task_worker_batch_size: int,
    task_worker_lease_seconds: int,
    task_worker_max_instances: int,
    task_worker_concurrency: int,
    leaderboard_daily_interval_seconds: int,
    leaderboard_weekly_interval_seconds: int,
    leaderboard_monthly_interval_seconds: int,
) -> None:
    interval = max(60, sync_interval_seconds)
    scheduler.add_job(
        enqueue_sync_jobs,
        trigger=IntervalTrigger(seconds=interval),
        id=_FANOUT_JOB_ID,
        replace_existing=True,
        jobstore=_JOBSTORE_PERSISTED,
    )
    _schedule_task_worker(
        scheduler,
        interval_seconds=task_worker_interval_seconds,
        batch_size=task_worker_batch_size,
        lease_seconds=task_worker_lease_seconds,
        max_instances=task_worker_max_instances,
        task_concurrency=task_worker_concurrency,
    )
    leaderboard_jobs = (
        (_DAILY_LEADERBOARD_JOB_ID, run_daily_leaderboard_refresh, leaderboard_daily_interval_seconds),
        (_WEEKLY_LEADERBOARD_JOB_ID, run_weekly_leaderboard_refresh, leaderboard_weekly_interval_seconds),
        (_MONTHLY_LEADERBOARD_JOB_ID, run_monthly_leaderboard_refresh, leaderboard_monthly_interval_seconds),
    )
    for job_id, func, interval_seconds in leaderboard_jobs:
        _schedule_interval_job(
            scheduler,
            job_id=job_id,
            func=func,
            interval_seconds=interval_seconds,
        )


def build_scheduler(
    interval_seconds: int,
    max_concurrent: int,
    *,
    schedule_periodic: bool = True,
    task_worker_interval_seconds: int = 10,
    task_worker_batch_size: int = 10,
    task_worker_lease_seconds: int = 3600,
    task_worker_max_instances: int | None = None,
    task_worker_concurrency: int | None = None,
    leaderboard_daily_interval_seconds: int = 3600,
    leaderboard_weekly_interval_seconds: int = 3600,
    leaderboard_monthly_interval_seconds: int = 3600,
) -> AsyncIOScheduler:
    global _SCHEDULER
    interval = max(60, interval_seconds)
    jobstores = {
        _JOBSTORE_PERSISTED: SQLAlchemyJobStore(engine=sync_engine),
        _JOBSTORE_EPHEMERAL: MemoryJobStore(),
    }
    executors = {
        "default": AsyncIOExecutor(),
        "threadpool": ThreadPoolExecutor(max_workers=max(1, max_concurrent)),
    }
    job_defaults = {
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": max(60, interval // 2),
    }
    scheduler = AsyncIOScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone=timezone.utc,
    )
    _SCHEDULER = scheduler
    if schedule_periodic:
        resolved_task_worker_max_instances = (
            max_concurrent if task_worker_max_instances is None else task_worker_max_instances
        )
        resolved_task_worker_concurrency = (
            max_concurrent if task_worker_concurrency is None else task_worker_concurrency
        )
        _schedule_periodic_jobs(
            scheduler,
            sync_interval_seconds=interval,
            task_worker_interval_seconds=task_worker_interval_seconds,
            task_worker_batch_size=task_worker_batch_size,
            task_worker_lease_seconds=task_worker_lease_seconds,
            task_worker_max_instances=resolved_task_worker_max_instances,
            task_worker_concurrency=resolved_task_worker_concurrency,
            leaderboard_daily_interval_seconds=leaderboard_daily_interval_seconds,
            leaderboard_weekly_interval_seconds=leaderboard_weekly_interval_seconds,
            leaderboard_monthly_interval_seconds=leaderboard_monthly_interval_seconds,
        )
    return scheduler
