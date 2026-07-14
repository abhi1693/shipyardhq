#!/usr/bin/env tsx

import { parseArgs } from "node:util"

import { loadEnvConfig } from "@next/env"

const DEFAULT_RETENTION_DAYS = 8
const MS_PER_DAY = 24 * 60 * 60 * 1000

type BackfillOptions = {
  dailyOnly: boolean
  days?: number
  endDate?: string
  help: boolean
  maxRows?: number
  startDate?: string
}

function printUsage() {
  console.log(`Usage:
  npm run analytics:backfill -- [options]

Backfills completed UTC days into the analytics rollup tables. Running the
same range again safely replaces that range's stored data.

Options:
  --days <n>              Completed days ending yesterday. Default: all days
                          available within configured retention.
  --start-date <date>     First UTC date in YYYY-MM-DD format.
  --end-date <date>       Last UTC date in YYYY-MM-DD format.
  --daily-only            Skip browser, OS, device, country, hourly, traffic
                          composition, and AI crawler breakdowns.
  --max-rows <n>          Cloud analytics group limit, from 1 to 10000.
  --help, -h              Show this help.

Examples:
  npm run analytics:backfill
  npm run analytics:backfill -- --days 7
  npm run analytics:backfill -- --start-date 2026-07-08 --end-date 2026-07-14
`)
}

function readPositiveInteger(
  value: string | undefined,
  option: string,
): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer`)
  }
  return parsed
}

function readIsoDate(value: string | undefined, option: string) {
  if (value === undefined) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${option} must use YYYY-MM-DD format`)
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${option} must be a valid calendar date`)
  }
  return value
}

function parseCliOptions(): BackfillOptions {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      days: { type: "string", short: "d" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      "daily-only": { type: "boolean", default: false },
      "max-rows": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
    strict: true,
  })

  const days = readPositiveInteger(values.days, "--days")
  const startDate = readIsoDate(values["start-date"], "--start-date")
  const endDate = readIsoDate(values["end-date"], "--end-date")
  const maxRows = readPositiveInteger(values["max-rows"], "--max-rows")

  if (Boolean(startDate) !== Boolean(endDate)) {
    throw new Error("--start-date and --end-date must be provided together")
  }
  if (days !== undefined && startDate) {
    throw new Error("Use either --days or an explicit date range, not both")
  }
  if (maxRows !== undefined && maxRows > 10_000) {
    throw new Error("--max-rows cannot exceed 10000")
  }

  return {
    dailyOnly: values["daily-only"] ?? false,
    days,
    endDate,
    help: values.help ?? false,
    maxRows,
    startDate,
  }
}

function readRetentionDays() {
  const configured = process.env.CLOUDFLARE_ANALYTICS_RETENTION_DAYS?.trim()
  if (!configured) return DEFAULT_RETENTION_DAYS

  const retentionDays = Number(configured)
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 2) {
    throw new Error(
      "CLOUDFLARE_ANALYTICS_RETENTION_DAYS must be an integer of at least 2",
    )
  }
  return retentionDays
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function formatElapsed(elapsedMs: number) {
  if (elapsedMs < 1_000) return `${elapsedMs}ms`
  return `${(elapsedMs / 1_000).toFixed(1)}s`
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatCount(value: number) {
  return Math.max(0, value).toLocaleString("en-US")
}

function humanizeDatasetName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\bai\b/i, "AI")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false
}

function summarizeJobStats(prefix: string, stats: unknown) {
  if (!isRecord(stats)) {
    console.info(`${prefix}: no structured result details returned`)
    return
  }

  if (Array.isArray(stats.breakdowns)) {
    const breakdowns = stats.breakdowns.filter(isRecord)
    const fetched = breakdowns.reduce(
      (total, breakdown) => total + readNumber(breakdown.rows),
      0,
    )
    const stored = breakdowns.reduce(
      (total, breakdown) => total + readNumber(breakdown.stored),
      0,
    )
    const truncated = breakdowns.some((breakdown) =>
      readBoolean(breakdown.truncated),
    )

    console.info(
      `${prefix}: stored ${formatCount(stored)} rows from ${formatCount(
        fetched,
      )} fetched groups across ${pluralize(breakdowns.length, "dataset")}${
        truncated ? "; at least one dataset hit the row limit" : ""
      }`,
    )

    for (const breakdown of breakdowns) {
      const name =
        typeof breakdown.name === "string"
          ? humanizeDatasetName(breakdown.name)
          : "Dataset"
      const queryWindows = readNumber(breakdown.queryWindows)
      const windowPart =
        queryWindows > 0 ? `, ${formatCount(queryWindows)} API requests` : ""
      console.info(
        `[analytics.backfill]   - ${name}: ${formatCount(
          readNumber(breakdown.rows),
        )} fetched, ${formatCount(
          readNumber(breakdown.stored),
        )} stored${windowPart}, ${
          readBoolean(breakdown.truncated) ? "truncated" : "complete"
        }`,
      )
    }
    return
  }

  if ("rows" in stats || "stored" in stats) {
    const rows = readNumber(stats.rows)
    const stored = readNumber(stats.stored)
    const pages = readNumber(stats.pages)
    console.info(
      `${prefix}: stored ${formatCount(stored)} rows from ${formatCount(
        rows,
      )} fetched groups${pages > 1 ? ` across ${formatCount(pages)} pages` : ""}${
        readBoolean(stats.truncated) ? "; hit the row limit" : ""
      }`,
    )
    return
  }

  console.info(`${prefix}: no recognized result summary`)
}

function validateRetentionWindow(args: {
  startDate: string
  endDate: string
  retentionDays: number
}) {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - MS_PER_DAY)
  const earliestCompletedDate = new Date(
    today.getTime() - (args.retentionDays - 1) * MS_PER_DAY,
  )
  const start = utcDate(args.startDate)
  const end = utcDate(args.endDate)

  if (start > end) {
    throw new Error("--start-date must be on or before --end-date")
  }
  if (end > yesterday) {
    throw new Error(
      `Backfills only include completed UTC days; --end-date cannot be later than ${yesterday
        .toISOString()
        .slice(0, 10)}`,
    )
  }
  if (start < earliestCompletedDate) {
    throw new Error(
      `The requested range starts before available retention. Earliest available completed date is ${earliestCompletedDate
        .toISOString()
        .slice(0, 10)}.`,
    )
  }
}

async function main() {
  const backfillStartedAt = Date.now()
  loadEnvConfig(process.cwd())

  const options = parseCliOptions()
  if (options.help) {
    printUsage()
    return
  }

  const retentionDays = readRetentionDays()
  const availableCompletedDays = retentionDays - 1
  const { resolveIngestionWindow } =
    await import("@/lib/server/analytics/ingestion/shared")
  const window = resolveIngestionWindow({
    startDate: options.startDate,
    endDate: options.endDate,
    days: options.days ?? availableCompletedDays,
  })

  validateRetentionWindow({
    startDate: window.startDate,
    endDate: window.endDate,
    retentionDays,
  })

  console.info(
    `[analytics.backfill] starting ${window.startDate} through ${
      window.endDate
    } (${pluralize(window.days, "completed UTC day")}; breakdowns ${
      options.dailyOnly ? "disabled" : "included"
    }; max ${formatCount(options.maxRows ?? 10_000)} groups/request)`,
  )
  console.info(
    "[analytics.backfill] analytics rows in this range will be replaced idempotently",
  )

  const [{ runAnalyticsIngestion }, { default: prisma }] = await Promise.all([
    import("@/lib/server/analytics/ingestion"),
    import("@/lib/prisma"),
  ])

  try {
    const result = await runAnalyticsIngestion({
      startDate: window.startDate,
      endDate: window.endDate,
      includeBreakdowns: !options.dailyOnly,
      invalidateNextCache: false,
      maxRows: options.maxRows,
      onProgress: (event) => {
        const prefix = `[analytics.backfill] [${event.jobIndex}/${event.jobCount}] ${event.job}`
        if (event.phase === "started") {
          console.info(`${prefix}: started (run ${event.runId})`)
          return
        }

        if (event.phase === "progress") {
          console.info(
            `${prefix}: ${event.message ?? "working"} (${formatElapsed(
              event.elapsedMs,
            )} elapsed)`,
          )
          return
        }

        if (event.phase === "failed") {
          console.error(
            `${prefix}: failed in ${formatElapsed(event.elapsedMs)} - ${
              event.error ?? "unknown error"
            }`,
          )
          return
        }

        console.info(
          `${prefix}: completed in ${formatElapsed(event.elapsedMs)}`,
        )
        summarizeJobStats(prefix, event.stats)
      },
    })

    const failures = result.results.filter((job) => job.status === "failed")
    if (failures.length > 0) {
      throw new Error(
        `${failures.length} analytics ingestion job${failures.length === 1 ? "" : "s"} failed`,
      )
    }

    console.info(
      `[analytics.backfill] completed in ${formatElapsed(
        Date.now() - backfillStartedAt,
      )}: ${pluralize(
        result.results.length - failures.length,
        "job",
      )} succeeded, ${pluralize(failures.length, "job")} failed (${
        result.window.startDate
      } through ${result.window.endDate})`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error("[analytics.backfill] failed", error)
  process.exitCode = 1
})
