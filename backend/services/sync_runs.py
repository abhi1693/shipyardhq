from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import Provider, SyncRun, Task, TaskStatus
from services.logger import AppLogger
from settings import get_settings

logger = AppLogger.get_logger(__name__)

_STALE_SYNC_ERROR_MESSAGE = "Sync stalled. Please retry."
_PROVIDER_SYNC_TASK_TYPE = "provider_sync"

def _is_running_status(status: str | None) -> bool:
    if not status:
        return False
    return status.strip().upper() == "RUNNING"


def _resolve_stale_cutoff_seconds() -> int:
    settings = get_settings()
    if settings.task_worker_lease_seconds <= 0:
        return 3600
    return settings.task_worker_lease_seconds


def _is_stale_sync_run(sync_run: SyncRun, *, stale_seconds: int) -> bool:
    if not _is_running_status(sync_run.status):
        return False
    if sync_run.finished_at is not None:
        return False
    if not sync_run.started_at:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=stale_seconds)
    return sync_run.started_at < cutoff


async def _mark_sync_run_stale(session: Session, sync_run: SyncRun) -> SyncRun:
    now = datetime.now(timezone.utc)
    sync_run.status = "FAILED"
    sync_run.error = sync_run.error or _STALE_SYNC_ERROR_MESSAGE
    sync_run.finished_at = sync_run.finished_at or now
    session.add(sync_run)
    cutoff = now - timedelta(seconds=_resolve_stale_cutoff_seconds())
    await _mark_stale_provider_sync_tasks(session, sync_run, now=now, cutoff=cutoff)
    await session.commit()
    await session.refresh(sync_run)
    logger.warning(
        "sync run marked stale",
        extra={"sync_run_id": sync_run.id, "user_id": sync_run.user_id},
    )
    return sync_run


async def _mark_stale_provider_sync_tasks(
    session: Session,
    sync_run: SyncRun,
    *,
    now: datetime | None = None,
    cutoff: datetime | None = None,
) -> int:
    if sync_run.user_id is None:
        return 0
    now = now or datetime.now(timezone.utc)
    if cutoff is None:
        stale_seconds = _resolve_stale_cutoff_seconds()
        cutoff = now - timedelta(seconds=stale_seconds)
    statement = (
        update(Task)
        .where(
            Task.task_type == _PROVIDER_SYNC_TASK_TYPE,
            Task.user_id == sync_run.user_id,
            Task.status == TaskStatus.RUNNING,
            Task.started_at.is_not(None),
            Task.started_at <= cutoff,
        )
        .values(
            status=TaskStatus.FAILED,
            finished_at=now,
            locked_until=None,
            locked_by=None,
            error=_STALE_SYNC_ERROR_MESSAGE,
            updated_at=now,
        )
    )
    result = await session.exec(statement)
    rowcount = int(getattr(result, "rowcount", 0) or 0)
    if rowcount:
        logger.warning(
            "stale provider sync tasks cleared",
            extra={"user_id": sync_run.user_id, "count": rowcount},
        )
    return rowcount


def _is_stale_error(sync_run: SyncRun) -> bool:
    if not sync_run.error:
        return False
    return sync_run.error.strip().lower().startswith("sync stalled")


async def get_latest_sync_run_for_user(
    session: Session, user_id: int, provider: Provider
) -> SyncRun | None:
    statement = (
        select(SyncRun)
        .where(SyncRun.user_id == user_id, SyncRun.provider == provider)
        .order_by(SyncRun.started_at.desc())
    )
    latest = (await session.exec(statement)).first()
    if not latest:
        return None
    stale_seconds = _resolve_stale_cutoff_seconds()
    if _is_stale_sync_run(latest, stale_seconds=stale_seconds):
        return await _mark_sync_run_stale(session, latest)
    if _is_stale_error(latest):
        cutoff = latest.finished_at or latest.started_at
        updated = await _mark_stale_provider_sync_tasks(session, latest, cutoff=cutoff)
        if updated:
            await session.commit()
    return latest
