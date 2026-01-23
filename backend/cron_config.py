from __future__ import annotations

from typing import Iterable

from rq import cron

from services.task_scheduler import (
    rq_cleanup_registries,
    rq_run_analytics_sync,
    rq_run_leaderboard_refresh,
    rq_run_rewards_backlinks,
    rq_run_rewards_placements,
    rq_run_rewards_streak,
)
from settings import get_settings

_QUEUE_NAME = "default"


def _normalize_ttl(value: int | None) -> int | None:
    if value is None:
        return None
    value = int(value)
    if value <= 0:
        return None
    return value


def _register_interval(
    func,
    interval_seconds: int,
    *,
    min_interval_seconds: int,
    args: Iterable[object] | None = None,
) -> None:
    if interval_seconds <= 0:
        return
    interval_seconds = max(min_interval_seconds, int(interval_seconds))
    cron.register(
        func,
        _QUEUE_NAME,
        args=tuple(args) if args else None,
        interval=interval_seconds,
        job_timeout=_JOB_TIMEOUT,
        result_ttl=_RESULT_TTL,
        failure_ttl=_FAILURE_TTL,
        ttl=_TTL,
    )


_SETTINGS = get_settings()
_JOB_TIMEOUT = (
    _SETTINGS.task_worker_lease_seconds
    if _SETTINGS.task_worker_lease_seconds > 0
    else None
)
_RESULT_TTL = _normalize_ttl(_SETTINGS.rq_job_result_ttl_seconds)
_FAILURE_TTL = _normalize_ttl(_SETTINGS.rq_job_failure_ttl_seconds)
_TTL = _normalize_ttl(_SETTINGS.rq_job_ttl_seconds)

_register_interval(
    rq_run_analytics_sync,
    _SETTINGS.analytics_sync_interval_seconds,
    min_interval_seconds=60,
)
_register_interval(
    rq_run_rewards_placements,
    _SETTINGS.rewards_placements_interval_seconds,
    min_interval_seconds=60,
)
_register_interval(
    rq_run_rewards_backlinks,
    _SETTINGS.rewards_backlinks_interval_seconds,
    min_interval_seconds=60,
)
_register_interval(
    rq_run_rewards_streak,
    _SETTINGS.rewards_streak_interval_seconds,
    min_interval_seconds=60,
)
_register_interval(
    rq_run_leaderboard_refresh,
    _SETTINGS.leaderboard_refresh_interval_seconds,
    min_interval_seconds=60,
)
_register_interval(
    rq_cleanup_registries,
    _SETTINGS.rq_registry_cleanup_interval_seconds,
    min_interval_seconds=300,
)
