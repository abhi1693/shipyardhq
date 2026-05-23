import { Queue, type JobsOptions } from "bullmq"

import {
  createBullMqConnection,
  getBullMqPrefix,
} from "@/lib/server/jobs/connection"

export const SCHEDULED_JOB_QUEUE_NAME = "shipyardhq-scheduled"
export const SCHEDULED_JOB_NAME = "scheduled-cron"
export const SCHEDULED_JOB_TIMEZONE = "Etc/UTC"

export type ScheduledJobDefinition = {
  id: string
  path: string
  pattern: string
  description: string
}

export const SCHEDULED_JOB_DEFINITIONS = [
  {
    id: "expire-plans",
    path: "/api/cron/expire-plans",
    pattern: "0 0 6 * * *",
    description: "Expire boosted and recurring plans.",
  },
  {
    id: "weekly-newsletter",
    path: "/api/cron/weekly-newsletter",
    pattern: "0 0 9 * * 4",
    description: "Send the weekly newsletter.",
  },
  {
    id: "monthly-leaderboard",
    path: "/api/cron/monthly-leaderboard",
    pattern: "0 0 8 1 * *",
    description: "Generate and announce monthly leaderboard winners.",
  },
  {
    id: "leaderboard-highlights-day",
    path: "/api/cron/leaderboard-highlights?period=day",
    pattern: "0 55 23 * * *",
    description: "Announce daily leaderboard highlights.",
  },
  {
    id: "leaderboard-highlights-week",
    path: "/api/cron/leaderboard-highlights?period=week",
    pattern: "0 55 23 * * 0",
    description: "Announce weekly leaderboard highlights.",
  },
  {
    id: "micro-leaderboards-midweek",
    path: "/api/cron/micro-leaderboards/midweek",
    pattern: "0 0 12 * * 3",
    description: "Send midweek micro-leaderboard nudges.",
  },
  {
    id: "rewards-placements",
    path: "/api/cron/rewards/placements",
    pattern: "0 */5 * * * *",
    description: "Activate and expire reward placement schedules.",
  },
  {
    id: "rewards-backlinks",
    path: "/api/cron/rewards/backlinks",
    pattern: "0 0 5 * * *",
    description: "Verify product backlinks for rewards.",
  },
  {
    id: "rewards-streak",
    path: "/api/cron/rewards/streak",
    pattern: "0 0 4 * * *",
    description: "Maintain reward streaks.",
  },
  {
    id: "leaderboard-refresh",
    path: "/api/cron/leaderboard-refresh",
    pattern: "0 0 */1 * * *",
    description: "Enqueue leaderboard refresh events.",
  },
  {
    id: "badges-trending",
    path: "/api/cron/badges/trending",
    pattern: "0 0 */12 * * *",
    description: "Assign trending badges.",
  },
  {
    id: "analytics-product-interest",
    path: "/api/cron/analytics/product-interest",
    pattern: "0 0 */3 * * *",
    description: "Refresh product interest analytics cache.",
  },
  {
    id: "analytics-sync",
    path: "/api/cron/analytics/sync?job=all&days=1",
    pattern: "0 0 2 * * *",
    description: "Sync analytics rollups.",
  },
  {
    id: "promotions-featured",
    path: "/api/cron/promotions/featured",
    pattern: "0 15 6 * * *",
    description: "Prepare featured plan promotion notifications.",
  },
  {
    id: "founder-visibility-owner",
    path: "/api/cron/founder-visibility?audience=owner",
    pattern: "0 0 0 * * 1",
    description: "Send owner founder-visibility engagement.",
  },
  {
    id: "dodo-discounts-cleanup",
    path: "/api/cron/dodo/discounts/cleanup",
    pattern: "0 0 3 * * 0",
    description: "Clean up expired unused Dodo discounts.",
  },
] as const satisfies ReadonlyArray<ScheduledJobDefinition>

export type ScheduledJobName = (typeof SCHEDULED_JOB_DEFINITIONS)[number]["id"]

export type ScheduledJobData = {
  jobName: ScheduledJobName
  path: string
}

const globalForScheduledQueue = globalThis as unknown as {
  __shipyardScheduledJobQueue?: Queue<ScheduledJobData, unknown, string>
}

const SCHEDULED_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 30 * 1000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 500,
  },
  removeOnFail: {
    age: 14 * 24 * 60 * 60,
    count: 2_000,
  },
} satisfies JobsOptions

export function getScheduledJobQueue(): Queue<
  ScheduledJobData,
  unknown,
  string
> {
  if (!globalForScheduledQueue.__shipyardScheduledJobQueue) {
    globalForScheduledQueue.__shipyardScheduledJobQueue = new Queue(
      SCHEDULED_JOB_QUEUE_NAME,
      {
        connection: createBullMqConnection("producer"),
        defaultJobOptions: SCHEDULED_JOB_OPTIONS,
        prefix: getBullMqPrefix(),
      },
    )
  }

  return globalForScheduledQueue.__shipyardScheduledJobQueue
}

export async function upsertScheduledJobs(): Promise<void> {
  const queue = getScheduledJobQueue()

  for (const definition of SCHEDULED_JOB_DEFINITIONS) {
    await queue.upsertJobScheduler(
      `scheduled-${definition.id}`,
      {
        pattern: definition.pattern,
        tz: SCHEDULED_JOB_TIMEZONE,
      },
      {
        name: SCHEDULED_JOB_NAME,
        data: {
          jobName: definition.id,
          path: definition.path,
        },
        opts: SCHEDULED_JOB_OPTIONS,
      },
    )
  }
}

export function getScheduledJobDefinition(
  jobName: ScheduledJobName,
): ScheduledJobDefinition {
  const definition = SCHEDULED_JOB_DEFINITIONS.find(
    (item) => item.id === jobName,
  )
  if (!definition) {
    throw new Error(`Unknown scheduled job "${jobName}"`)
  }
  return definition
}

export function isScheduledJobName(value: unknown): value is ScheduledJobName {
  return (
    typeof value === "string" &&
    SCHEDULED_JOB_DEFINITIONS.some((definition) => definition.id === value)
  )
}

export async function closeScheduledJobQueue(): Promise<void> {
  const queue = globalForScheduledQueue.__shipyardScheduledJobQueue
  if (!queue) return
  globalForScheduledQueue.__shipyardScheduledJobQueue = undefined
  await queue.close()
}
