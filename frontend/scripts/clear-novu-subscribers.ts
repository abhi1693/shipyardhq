#!/usr/bin/env tsx
import { config as loadDotenv } from "dotenv"

type ParsedArgs = {
  showHelp: boolean
  confirm: boolean
  limit: number
  max: number | null
  prefix: string | null
  contains: string | null
  sleepMs: number
}

function parseArgs(): ParsedArgs {
  const [, , ...rawArgs] = process.argv

  let showHelp = false
  let confirm = false
  let limit = 100
  let max: number | null = null
  let prefix: string | null = null
  let contains: string | null = null
  let sleepMs = 0

  for (let i = 0; i < rawArgs.length; i += 1) {
    const current = rawArgs[i]
    const next = rawArgs[i + 1]

    if (current === "-h" || current === "--help") {
      showHelp = true
      continue
    }

    if (current === "--confirm") {
      confirm = true
      continue
    }

    if (current === "--limit" && next) {
      limit = Number(next)
      i += 1
      continue
    }

    if (current.startsWith("--limit=")) {
      limit = Number(current.replace("--limit=", ""))
      continue
    }

    if (current === "--max" && next) {
      max = Number(next)
      i += 1
      continue
    }

    if (current.startsWith("--max=")) {
      max = Number(current.replace("--max=", ""))
      continue
    }

    if (current === "--prefix" && next) {
      prefix = next
      i += 1
      continue
    }

    if (current.startsWith("--prefix=")) {
      prefix = current.replace("--prefix=", "")
      continue
    }

    if (current === "--contains" && next) {
      contains = next
      i += 1
      continue
    }

    if (current.startsWith("--contains=")) {
      contains = current.replace("--contains=", "")
      continue
    }

    if (current === "--sleep-ms" && next) {
      sleepMs = Number(next)
      i += 1
      continue
    }

    if (current.startsWith("--sleep-ms=")) {
      sleepMs = Number(current.replace("--sleep-ms=", ""))
      continue
    }
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`Invalid --limit: ${String(limit)}`)
  }

  if (max !== null && (!Number.isFinite(max) || max <= 0)) {
    throw new Error(`Invalid --max: ${String(max)}`)
  }

  if (!Number.isFinite(sleepMs) || sleepMs < 0) {
    throw new Error(`Invalid --sleep-ms: ${String(sleepMs)}`)
  }

  return {
    showHelp,
    confirm,
    limit: Math.floor(limit),
    max: max === null ? null : Math.floor(max),
    prefix: prefix?.trim() || null,
    contains: contains?.trim() || null,
    sleepMs: Math.floor(sleepMs),
  }
}

function shouldDeleteSubscriber(
  subscriberId: string,
  filters: { prefix: string | null; contains: string | null },
): boolean {
  const trimmed = subscriberId.trim()
  if (!trimmed) return false

  if (filters.prefix && !trimmed.startsWith(filters.prefix)) {
    return false
  }

  if (filters.contains && !trimmed.includes(filters.contains)) {
    return false
  }

  return true
}

function ensureSafeToRun(confirm: boolean) {
  const env = process.env.NODE_ENV?.trim().toLowerCase() || "development"
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase()

  if ((env === "production" || vercelEnv === "production") && confirm) {
    throw new Error("Refusing to delete Novu subscribers in production.")
  }
}

async function sleep(ms: number) {
  if (!ms) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const { showHelp, confirm, limit, max, prefix, contains, sleepMs } =
    parseArgs()

  if (showHelp) {
    console.info(
      [
        "Clear Novu subscribers (development helper).",
        "",
        "Dry-run (lists matching subscribers):",
        "  npx tsx scripts/clear-novu-subscribers.ts",
        "",
        "Delete (requires explicit confirmation):",
        "  npx tsx scripts/clear-novu-subscribers.ts --confirm",
        "",
        "Options:",
        "  --confirm               Actually delete matching subscribers",
        "  --limit <n>             Page size when scanning (default: 100)",
        "  --max <n>               Stop after deleting/listing n subscribers",
        "  --prefix <value>        Only delete subscriberIds starting with value",
        "  --contains <value>      Only delete subscriberIds containing value",
        "  --sleep-ms <n>          Sleep between deletes (default: 0)",
        "  -h, --help              Show this help",
        "",
        "Required env vars:",
        "  NOVU_SECRET_KEY",
      ].join("\n"),
    )
    return
  }

  ensureSafeToRun(confirm)

  loadDotenv({ path: ".env.local" })
  loadDotenv({ path: ".env" })

  const { getNovuClient, isNovuEnabled } =
    await import("@/lib/server/notifications/novu")

  if (!isNovuEnabled()) {
    throw new Error("NOVU_SECRET_KEY is required to manage subscribers.")
  }

  const client = getNovuClient()

  const filters = { prefix, contains }
  const actionLabel = confirm ? "delete" : "dry-run"

  console.info(
    JSON.stringify(
      {
        action: actionLabel,
        limit,
        max,
        filters,
        sleepMs,
      },
      null,
      2,
    ),
  )

  let cursor: string | undefined
  let matched = 0
  let processed = 0
  let deleted = 0

  do {
    const response = await client.subscribers.search({ limit, after: cursor })
    const page = response.result?.data ?? []
    cursor = response.result?.next ?? undefined

    for (const subscriber of page) {
      processed += 1
      const subscriberId = subscriber.subscriberId?.trim() ?? ""
      if (!subscriberId) continue

      if (!shouldDeleteSubscriber(subscriberId, filters)) continue
      matched += 1

      if (!confirm) {
        console.info(`[dry-run] ${subscriberId}`)
      } else {
        await client.subscribers.delete(subscriberId)
        deleted += 1
        console.info(`[deleted] ${subscriberId}`)
        await sleep(sleepMs)
      }

      if (max !== null && (confirm ? deleted : matched) >= max) {
        cursor = undefined
        break
      }
    }
  } while (cursor)

  console.info(
    JSON.stringify(
      {
        action: actionLabel,
        processed,
        matched,
        deleted,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[clear-novu-subscribers] ${message}`)
  process.exitCode = 1
})
