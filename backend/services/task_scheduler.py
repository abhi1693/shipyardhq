from __future__ import annotations

import hashlib
from typing import Any, Callable, Iterable

import anyio
from redis import Redis
from rq import Queue
from rq.job import JobStatus, Retry
from rq.registry import clean_registries

from services.logger import AppLogger
from settings import get_settings

logger = AppLogger.get_logger(__name__)


class SchedulerUnavailableError(RuntimeError):
    pass


_RQ_CONNECTION: Redis | None = None
_RQ_QUEUE: Queue | None = None
_RQ_QUEUE_NAME = "default"
_DEFAULT_JOB_MAX_ATTEMPTS = 5
_RQ_JOB_TERMINAL_STATUSES = {
    JobStatus.FINISHED,
    JobStatus.FAILED,
    JobStatus.CANCELED,
    JobStatus.STOPPED,
}

_TASK_TYPE_ANALYTICS_SYNC = "analytics_sync"
_TASK_TYPE_REWARDS_PLACEMENTS = "rewards_placements"
_TASK_TYPE_REWARDS_BACKLINKS = "rewards_backlinks"
_TASK_TYPE_REWARDS_STREAK = "rewards_streak"
_TASK_TYPE_LEADERBOARD_REFRESH = "leaderboard_refresh"


def _get_rq_connection() -> Redis:
    settings = get_settings()
    if not settings.redis_url:
        raise SchedulerUnavailableError("Redis URL not configured for RQ.")
    global _RQ_CONNECTION
    if _RQ_CONNECTION is None:
        _RQ_CONNECTION = Redis.from_url(settings.redis_url)
    return _RQ_CONNECTION


def _get_rq_queue() -> Queue:
    global _RQ_QUEUE
    if _RQ_QUEUE is None:
        _RQ_QUEUE = Queue(name=_RQ_QUEUE_NAME, connection=_get_rq_connection())
    return _RQ_QUEUE


def _build_job_id(task_type: str, dedupe_key: str | None) -> str | None:
    if not dedupe_key:
        return None
    raw_key = f"{task_type}:{dedupe_key}"
    digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:20]
    return f"{task_type}-{digest}"


def _compute_task_backoff(attempts: int) -> int:
    return min(300, max(30, 30 * (2 ** (max(1, attempts) - 1))))


def _build_retry(max_attempts: int = _DEFAULT_JOB_MAX_ATTEMPTS) -> Retry | None:
    retries = max(0, int(max_attempts) - 1)
    if retries <= 0:
        return None
    intervals = [_compute_task_backoff(attempt) for attempt in range(1, retries + 1)]
    return Retry(max=retries, interval=intervals)


def _normalize_ttl(value: int | None) -> int | None:
    if value is None:
        return None
    value = int(value)
    if value <= 0:
        return None
    return value


def _enqueue_rq_job(
    *,
    task_type: str,
    func: Callable[..., Any],
    args: Iterable[Any] | None = None,
    kwargs: dict[str, Any] | None = None,
    dedupe_key: str | None = None,
    retry: Retry | None = None,
    timeout: int | None = None,
) -> bool:
    settings = get_settings()
    result_ttl = _normalize_ttl(settings.rq_job_result_ttl_seconds)
    failure_ttl = _normalize_ttl(settings.rq_job_failure_ttl_seconds)
    ttl = _normalize_ttl(settings.rq_job_ttl_seconds)
    queue = _get_rq_queue()
    job_id = _build_job_id(task_type, dedupe_key)
    if job_id:
        existing = queue.fetch_job(job_id)
        if existing:
            status = existing.get_status()
            if status not in _RQ_JOB_TERMINAL_STATUSES:
                logger.info(
                    "rq job already queued",
                    extra={"task_type": task_type, "job_id": job_id, "status": status},
                )
                return False
            existing.delete()
    job_args = tuple(args) if args else ()
    job_kwargs = kwargs or {}
    queue.enqueue(
        func,
        *job_args,
        **job_kwargs,
        job_id=job_id,
        retry=retry,
        result_ttl=result_ttl,
        failure_ttl=failure_ttl,
        ttl=ttl,
        job_timeout=timeout,
    )
    return True


def rq_cleanup_registries() -> None:
    queue = _get_rq_queue()
    clean_registries(queue)
    logger.info("rq registries cleaned")


async def _enqueue_rq_job_async(**kwargs: Any) -> bool:
    return await anyio.to_thread.run_sync(lambda: _enqueue_rq_job(**kwargs))


def _run_async_job(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    return anyio.run(func, *args, **kwargs)


async def run_analytics_sync() -> None:
    logger.info("analytics sync start")
    logger.info("analytics sync skipped (not implemented)")


async def run_rewards_placements() -> None:
    logger.info("rewards placements start")
    logger.info("rewards placements skipped (not implemented)")


async def run_rewards_backlinks() -> None:
    logger.info("rewards backlinks start")
    logger.info("rewards backlinks skipped (not implemented)")


async def run_rewards_streak() -> None:
    logger.info("rewards streak start")
    logger.info("rewards streak skipped (not implemented)")


async def run_leaderboard_refresh() -> None:
    logger.info("leaderboard refresh start")
    logger.info("leaderboard refresh skipped (not implemented)")


def rq_run_analytics_sync() -> None:
    _run_async_job(run_analytics_sync)


def rq_run_rewards_placements() -> None:
    _run_async_job(run_rewards_placements)


def rq_run_rewards_backlinks() -> None:
    _run_async_job(run_rewards_backlinks)


def rq_run_rewards_streak() -> None:
    _run_async_job(run_rewards_streak)


def rq_run_leaderboard_refresh() -> None:
    _run_async_job(run_leaderboard_refresh)


async def enqueue_analytics_sync() -> None:
    retry = _build_retry()
    settings = get_settings()
    timeout_seconds = (
        settings.task_worker_lease_seconds if settings.task_worker_lease_seconds > 0 else None
    )
    try:
        created = await _enqueue_rq_job_async(
            task_type=_TASK_TYPE_ANALYTICS_SYNC,
            func=rq_run_analytics_sync,
            dedupe_key=_TASK_TYPE_ANALYTICS_SYNC,
            retry=retry,
            timeout=timeout_seconds,
        )
    except SchedulerUnavailableError as exc:
        logger.warning("rq enqueue skipped for analytics", extra={"error": str(exc)})
        return
    if not created:
        logger.info("analytics sync already queued")


async def enqueue_rewards_placements() -> None:
    retry = _build_retry()
    settings = get_settings()
    timeout_seconds = (
        settings.task_worker_lease_seconds if settings.task_worker_lease_seconds > 0 else None
    )
    try:
        created = await _enqueue_rq_job_async(
            task_type=_TASK_TYPE_REWARDS_PLACEMENTS,
            func=rq_run_rewards_placements,
            dedupe_key=_TASK_TYPE_REWARDS_PLACEMENTS,
            retry=retry,
            timeout=timeout_seconds,
        )
    except SchedulerUnavailableError as exc:
        logger.warning("rq enqueue skipped for placements", extra={"error": str(exc)})
        return
    if not created:
        logger.info("rewards placements already queued")


async def enqueue_rewards_backlinks() -> None:
    retry = _build_retry()
    settings = get_settings()
    timeout_seconds = (
        settings.task_worker_lease_seconds if settings.task_worker_lease_seconds > 0 else None
    )
    try:
        created = await _enqueue_rq_job_async(
            task_type=_TASK_TYPE_REWARDS_BACKLINKS,
            func=rq_run_rewards_backlinks,
            dedupe_key=_TASK_TYPE_REWARDS_BACKLINKS,
            retry=retry,
            timeout=timeout_seconds,
        )
    except SchedulerUnavailableError as exc:
        logger.warning("rq enqueue skipped for backlinks", extra={"error": str(exc)})
        return
    if not created:
        logger.info("rewards backlinks already queued")


async def enqueue_rewards_streak() -> None:
    retry = _build_retry()
    settings = get_settings()
    timeout_seconds = (
        settings.task_worker_lease_seconds if settings.task_worker_lease_seconds > 0 else None
    )
    try:
        created = await _enqueue_rq_job_async(
            task_type=_TASK_TYPE_REWARDS_STREAK,
            func=rq_run_rewards_streak,
            dedupe_key=_TASK_TYPE_REWARDS_STREAK,
            retry=retry,
            timeout=timeout_seconds,
        )
    except SchedulerUnavailableError as exc:
        logger.warning("rq enqueue skipped for streak", extra={"error": str(exc)})
        return
    if not created:
        logger.info("rewards streak already queued")


async def enqueue_leaderboard_refresh() -> None:
    retry = _build_retry()
    settings = get_settings()
    timeout_seconds = (
        settings.task_worker_lease_seconds if settings.task_worker_lease_seconds > 0 else None
    )
    try:
        created = await _enqueue_rq_job_async(
            task_type=_TASK_TYPE_LEADERBOARD_REFRESH,
            func=rq_run_leaderboard_refresh,
            dedupe_key=_TASK_TYPE_LEADERBOARD_REFRESH,
            retry=retry,
            timeout=timeout_seconds,
        )
    except SchedulerUnavailableError as exc:
        logger.warning("rq enqueue skipped for leaderboard", extra={"error": str(exc)})
        return
    if not created:
        logger.info("leaderboard refresh already queued")


def rq_enqueue_analytics_sync() -> None:
    _run_async_job(enqueue_analytics_sync)


def rq_enqueue_rewards_placements() -> None:
    _run_async_job(enqueue_rewards_placements)


def rq_enqueue_rewards_backlinks() -> None:
    _run_async_job(enqueue_rewards_backlinks)


def rq_enqueue_rewards_streak() -> None:
    _run_async_job(enqueue_rewards_streak)


def rq_enqueue_leaderboard_refresh() -> None:
    _run_async_job(enqueue_leaderboard_refresh)
