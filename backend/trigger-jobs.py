#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if Path.cwd() != BACKEND_DIR:
    os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

import anyio
from services.task_scheduler import (
    enqueue_analytics_sync,
    enqueue_leaderboard_refresh,
    enqueue_rewards_backlinks,
    enqueue_rewards_placements,
    enqueue_rewards_streak,
)

JOB_DESCRIPTIONS = {
    "analytics_sync": "Queue analytics ingest.",
    "rewards_placements": "Queue placement schedule processing.",
    "rewards_backlinks": "Queue backlink verification rewards.",
    "rewards_streak": "Queue streak reward processing.",
    "leaderboard_refresh": "Queue leaderboard score refresh.",
}
DEFAULT_JOBS = tuple(JOB_DESCRIPTIONS.keys())


def _normalize_job_name(value: str) -> str:
    return value.strip().lower().replace("-", "_")


def _normalize_jobs(values: list[str], run_all: bool) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in values:
        job = _normalize_job_name(raw)
        if not job:
            continue
        if job == "all":
            return list(DEFAULT_JOBS)
        if job not in seen:
            normalized.append(job)
            seen.add(job)
    if run_all:
        return list(DEFAULT_JOBS)
    if not normalized:
        raise SystemExit(
            f"error: no jobs specified; choose from: {', '.join(DEFAULT_JOBS)}"
        )
    invalid = [job for job in normalized if job not in JOB_DESCRIPTIONS]
    if invalid:
        raise SystemExit(
            "error: unknown jobs: "
            + ", ".join(invalid)
            + f"; choose from: {', '.join(DEFAULT_JOBS)}"
        )
    return normalized


async def _run_jobs(job_names: list[str]) -> None:
    for job in job_names:
        if job == "analytics_sync":
            await enqueue_analytics_sync()
        elif job == "rewards_placements":
            await enqueue_rewards_placements()
        elif job == "rewards_backlinks":
            await enqueue_rewards_backlinks()
        elif job == "rewards_streak":
            await enqueue_rewards_streak()
        elif job == "leaderboard_refresh":
            await enqueue_leaderboard_refresh()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Trigger RQ-backed scheduler jobs.",
    )
    parser.add_argument(
        "jobs",
        nargs="*",
        help="Jobs to trigger (use --list to see options).",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Trigger all scheduled jobs.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available jobs and exit.",
    )
    args = parser.parse_args()

    if args.list:
        for name in DEFAULT_JOBS:
            print(f"{name}: {JOB_DESCRIPTIONS[name]}")
        return 0

    jobs = _normalize_jobs(args.jobs, args.all)
    anyio.run(_run_jobs, jobs)
    print("Queued jobs: " + ", ".join(jobs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
