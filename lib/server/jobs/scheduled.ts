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
  pattern: string
  description: string
}

export const SCHEDULED_JOB_DEFINITIONS = [
  {
    id: "expire-plans",
    pattern: "0 0 6 * * *",
    description: "Expire boosted and recurring plans.",
  },
  {
    id: "monthly-leaderboard",
    pattern: "0 0 8 1 * *",
    description: "Generate and announce monthly leaderboard winners.",
  },
  {
    id: "leaderboard-highlights-day",
    pattern: "0 55 23 * * *",
    description: "Announce daily leaderboard highlights.",
  },
  {
    id: "leaderboard-highlights-week",
    pattern: "0 55 23 * * 0",
    description: "Announce weekly leaderboard highlights.",
  },
  {
    id: "homepage-feed-refresh",
    pattern: "0 */5 * * * *",
    description: "Refresh and warm homepage feed cache.",
  },
  {
    id: "leaderboard-refresh",
    pattern: "0 0 */1 * * *",
    description: "Enqueue leaderboard refresh events.",
  },
  {
    id: "leaderboard-historical-cache",
    pattern: "0 15 */1 * * *",
    description: "Warm historical leaderboard Redis cache.",
  },
  {
    id: "badges-trending",
    pattern: "0 0 */12 * * *",
    description: "Assign trending badges.",
  },
  {
    id: "analytics-product-interest",
    pattern: "0 0 */3 * * *",
    description: "Refresh product interest analytics cache.",
  },
  {
    id: "analytics-sync",
    pattern: "0 0 2 * * *",
    description: "Sync analytics rollups.",
  },
  {
    id: "dodo-discounts-cleanup",
    pattern: "0 0 3 * * 0",
    description: "Clean up expired unused Dodo discounts.",
  },
] as const satisfies ReadonlyArray<ScheduledJobDefinition>

const RETIRED_SCHEDULED_JOB_IDS = [
  "backlink-verification",
  "rewards-backlinks",
  "rewards-placements",
  "rewards-streak",
] as const

export type ScheduledJobName = (typeof SCHEDULED_JOB_DEFINITIONS)[number]["id"]

export type ScheduledJobData = {
  jobName: ScheduledJobName
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

  for (const retiredId of RETIRED_SCHEDULED_JOB_IDS) {
    try {
      await queue.removeJobScheduler(`scheduled-${retiredId}`)
    } catch (error) {
      console.error("[scheduled] failed to remove retired job scheduler", {
        id: retiredId,
        error,
      })
    }
  }

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
