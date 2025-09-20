import dotenv from "dotenv"
import path from "node:path"
import { promises as fs } from "node:fs"

dotenv.config()
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: false,
})

type SkipSummaryMetrics = {
  wordCount?: number
  linkCount?: number
  upvotes?: number
  launchStage?: string
  audience?: string
  sentiment?: string
}

type SkipLogEntry = {
  id: string
  permalink: string
  subreddit: string
  title: string
  skippedAt: string
  source: "auto" | "manual"
  reason?: string
  keywords?: string[]
  topicSignature?: string | null
  summary?: string
  intent?: string
  metrics?: SkipSummaryMetrics
}

function parseLimit(args: string[]): number {
  for (const arg of args) {
    if (arg.startsWith("--limit")) {
      const [, value] = arg.split("=")
      const parsed = Number.parseInt(value || "", 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
      }
    }
  }
  return 10
}

function shouldShowJson(args: string[]): boolean {
  return args.includes("--json")
}

async function readSkipLog(filePath: string): Promise<SkipLogEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(Boolean)
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return []
    }
    console.warn(`Unable to read skip log at ${filePath}:`, error)
    return []
  }
}

function formatMetrics(metrics?: SkipSummaryMetrics): string {
  if (!metrics) {
    return "(none)"
  }
  const parts: string[] = []
  if (metrics.launchStage) {
    parts.push(`stage=${metrics.launchStage}`)
  }
  if (metrics.audience) {
    parts.push(`audience=${metrics.audience}`)
  }
  if (metrics.sentiment) {
    parts.push(`sentiment=${metrics.sentiment}`)
  }
  if (typeof metrics.wordCount === "number") {
    parts.push(`words=${metrics.wordCount}`)
  }
  if (typeof metrics.linkCount === "number") {
    parts.push(`links=${metrics.linkCount}`)
  }
  if (typeof metrics.upvotes === "number") {
    parts.push(`upvotes=${metrics.upvotes}`)
  }
  return parts.length ? parts.join(", ") : "(none)"
}

async function main() {
  const args = process.argv.slice(2)
  const limit = parseLimit(args)
  const asJson = shouldShowJson(args)

  const skipLogPath =
    process.env.REDDIT_SKIP_LOG_FILE ||
    path.join(process.cwd(), "tmp", "reddit-bot-skips.json")

  const entries = await readSkipLog(skipLogPath)

  if (!entries.length) {
    console.log(`No skip log entries found at ${skipLogPath}.`)
    return
  }

  const sorted = [...entries].sort((a, b) => {
    const aTime = new Date(a.skippedAt).getTime()
    const bTime = new Date(b.skippedAt).getTime()
    return bTime - aTime
  })

  if (asJson) {
    console.log(JSON.stringify(sorted.slice(0, limit), null, 2))
    return
  }

  console.log(
    `Loaded ${entries.length} skip entries from ${skipLogPath}. Showing latest ${Math.min(limit, sorted.length)}.`,
  )

  sorted.slice(0, limit).forEach((entry, index) => {
    const timestamp = new Date(entry.skippedAt)
      .toLocaleString(undefined, {
        hour12: false,
      })
      .replace(",", "")
    console.log(`\n${index + 1}. [${timestamp}] r/${entry.subreddit}`)
    console.log(`   Title   : ${entry.title || "(untitled)"}`)
    console.log(`   Reason  : ${entry.reason || "(unspecified)"}`)
    if (entry.summary) {
      console.log(`   Summary : ${entry.summary}`)
    }
    if (entry.intent) {
      console.log(`   Intent  : ${entry.intent}`)
    }
    console.log(`   Metrics : ${formatMetrics(entry.metrics)}`)
    console.log(`   Link    : ${entry.permalink}`)
  })
}

main().catch((error) => {
  console.error("Failed to read reddit skip log:", error)
  process.exitCode = 1
})
