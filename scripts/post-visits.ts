import { randomUUID } from "node:crypto"

const MAX_VISITS_PER_RUN = 100
const DEFAULT_ORIGIN = "http://localhost:3000"
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_SRC = "https://trustviews.io/script.js"
const DEFAULT_PAGE_ORIGIN = "https://shipyardhq.dev"
const DEFAULT_REFERER = "https://shipyardhq.dev"
const DEFAULT_DELAY_MS = 30_000
const DEFAULT_COUNT = 100
const DEFAULT_JITTER_RATIO = 0.1

type ParsedArgs = {
  token?: string
  origin?: string
  src?: string
  pageOrigin?: string
  referer?: string
  count: number
  delayMs: number
  jitterMs?: number
  timeoutMs: number
  allowRemote: boolean
  dryRun: boolean
  showHelp: boolean
}

function parseArgs(): ParsedArgs {
  const [, , ...rawArgs] = process.argv

  const parsed: ParsedArgs = {
    count: DEFAULT_COUNT,
    delayMs: DEFAULT_DELAY_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    allowRemote: true,
    dryRun: false,
    showHelp: false,
  }

  for (let i = 0; i < rawArgs.length; i += 1) {
    const current = rawArgs[i]
    const next = rawArgs[i + 1]

    if (current === "-h" || current === "--help") {
      parsed.showHelp = true
      continue
    }

    if (current === "--allow-remote") {
      parsed.allowRemote = true
      continue
    }

    if (current === "--dry-run") {
      parsed.dryRun = true
      continue
    }

    if (current === "--token" && next) {
      parsed.token = next
      i += 1
      continue
    }

    if (current.startsWith("--token=")) {
      parsed.token = current.replace("--token=", "")
      continue
    }

    if (current === "--origin" && next) {
      parsed.origin = next
      i += 1
      continue
    }

    if (current.startsWith("--origin=")) {
      parsed.origin = current.replace("--origin=", "")
      continue
    }

    if (current === "--src" && next) {
      parsed.src = next
      i += 1
      continue
    }

    if (current.startsWith("--src=")) {
      parsed.src = current.replace("--src=", "")
      continue
    }

    if (current === "--page-origin" && next) {
      parsed.pageOrigin = next
      i += 1
      continue
    }

    if (current.startsWith("--page-origin=")) {
      parsed.pageOrigin = current.replace("--page-origin=", "")
      continue
    }

    if ((current === "--referer" || current === "--referrer") && next) {
      parsed.referer = next
      i += 1
      continue
    }

    if (current.startsWith("--referer=")) {
      parsed.referer = current.replace("--referer=", "")
      continue
    }

    if (current.startsWith("--referrer=")) {
      parsed.referer = current.replace("--referrer=", "")
      continue
    }

    if (current === "--jitter-ms" && next) {
      parsed.jitterMs = Number.parseInt(next, 10)
      i += 1
      continue
    }

    if (current.startsWith("--jitter-ms=")) {
      parsed.jitterMs = Number.parseInt(current.replace("--jitter-ms=", ""), 10)
      continue
    }

    if (current === "--count" && next) {
      parsed.count = Number.parseInt(next, 10)
      i += 1
      continue
    }

    if (current.startsWith("--count=")) {
      parsed.count = Number.parseInt(current.replace("--count=", ""), 10)
      continue
    }

    if (current === "--delay-ms" && next) {
      parsed.delayMs = Number.parseInt(next, 10)
      i += 1
      continue
    }

    if (current.startsWith("--delay-ms=")) {
      parsed.delayMs = Number.parseInt(current.replace("--delay-ms=", ""), 10)
      continue
    }

    if (current === "--timeout-ms" && next) {
      parsed.timeoutMs = Number.parseInt(next, 10)
      i += 1
      continue
    }

    if (current.startsWith("--timeout-ms=")) {
      parsed.timeoutMs = Number.parseInt(
        current.replace("--timeout-ms=", ""),
        10,
      )
      continue
    }

    if (current.startsWith("-")) {
      continue
    }

    if (!parsed.token) {
      parsed.token = current
      continue
    }

    if (!parsed.origin && !parsed.src) {
      parsed.origin = current
      continue
    }

    if (parsed.count === 1) {
      const count = Number.parseInt(current, 10)
      if (!Number.isNaN(count)) {
        parsed.count = count
      }
    }
  }

  if (!parsed.src && !parsed.origin) {
    parsed.src = DEFAULT_SRC
  }
  if (!parsed.pageOrigin) {
    parsed.pageOrigin = DEFAULT_PAGE_ORIGIN
  }
  if (!parsed.referer) {
    parsed.referer = DEFAULT_REFERER
  }
  if (typeof parsed.jitterMs !== "number") {
    parsed.jitterMs = Math.round(parsed.delayMs * DEFAULT_JITTER_RATIO)
  }

  return parsed
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  )
}

function resolveVisitsEndpoint(args: ParsedArgs): URL {
  if (args.src) {
    if (!args.src.startsWith("http://") && !args.src.startsWith("https://")) {
      const origin = args.origin ?? DEFAULT_ORIGIN
      throw new Error(
        `--src must be an absolute URL. Use --origin ${origin} when your script src is relative.`,
      )
    }

    const base = new URL(args.src)
    return new URL("/api/visits", base)
  }

  const base = new URL(args.origin ?? DEFAULT_ORIGIN)
  return new URL("/api/visits", base)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function delayWithJitter(baseDelayMs: number, jitterMs: number): number {
  if (baseDelayMs <= 0) return 0
  if (jitterMs <= 0) return baseDelayMs

  const delta = (Math.random() * 2 - 1) * jitterMs
  return Math.max(0, Math.round(baseDelayMs + delta))
}

function parseHttpUrl(value: string, label: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`Invalid ${label} URL: ${value}`)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must start with http:// or https://`)
  }

  return url
}

async function main() {
  const args = parseArgs()

  if (args.showHelp) {
    console.info(
      [
        "Purpose:",
        "  Sends POST requests to /api/visits for QA/load testing your own endpoint.",
        "  (It does not attempt to mimic real users or bypass bot detection.)",
        "",
        "Usage:",
        "  npx tsx scripts/post-visits.ts --token <token> [--origin <url> | --src <script-url>] [options]",
        "",
        "Options:",
        `  --count <n>         Number of requests (1-${MAX_VISITS_PER_RUN}, default: ${DEFAULT_COUNT})`,
        `  --delay-ms <ms>     Fixed delay between requests (default: ${DEFAULT_DELAY_MS})`,
        "  --jitter-ms <ms>    Adds +/- jitter to --delay-ms (default: 10% of --delay-ms)",
        `  --timeout-ms <ms>   Per-request timeout (default: ${DEFAULT_TIMEOUT_MS})`,
        `  --src <url>         Script URL for deriving /api/visits (default: ${DEFAULT_SRC})`,
        `  --page-origin <url> Set the Origin header (default: ${DEFAULT_PAGE_ORIGIN})`,
        `  --referer <url>     Set the Referer header (default: ${DEFAULT_REFERER})`,
        "  --allow-remote      Allow non-local origins (default: true)",
        "  --dry-run           Print the requests without sending them",
        "  -h, --help          Show this help",
      ].join("\n"),
    )
    return
  }

  const token = args.token ?? process.env.VISIT_TOKEN
  if (!token) {
    throw new Error("Missing token. Pass --token <token> or set VISIT_TOKEN.")
  }

  const pageOrigin = args.pageOrigin
    ? parseHttpUrl(args.pageOrigin, "--page-origin").origin
    : undefined
  const referer = args.referer
    ? parseHttpUrl(args.referer, "--referer").toString()
    : undefined

  if (
    !Number.isFinite(args.count) ||
    args.count < 1 ||
    args.count > MAX_VISITS_PER_RUN
  ) {
    throw new Error(`--count must be between 1 and ${MAX_VISITS_PER_RUN}`)
  }

  if (!Number.isFinite(args.delayMs) || args.delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative integer")
  }

  if (!Number.isFinite(args.jitterMs) || (args.jitterMs ?? 0) < 0) {
    throw new Error("--jitter-ms must be a non-negative integer")
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1) {
    throw new Error("--timeout-ms must be a positive integer")
  }

  const endpoint = resolveVisitsEndpoint(args)

  if (!args.allowRemote && !isLocalHostname(endpoint.hostname)) {
    throw new Error(
      `Refusing to send requests to non-local origin (${endpoint.origin}). Re-run with --allow-remote if this is your own staging/test environment.`,
    )
  }

  const runId = randomUUID()
  const body = new URLSearchParams({ token }).toString()
  const redactedBody = new URLSearchParams({ token: "[redacted]" }).toString()

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "ShipyardHQ-VisitsTester/1.0",
    "X-Visits-Test-Run": runId,
  }
  if (pageOrigin) headers.Origin = pageOrigin
  if (referer) headers.Referer = referer

  console.info(
    `Sending ${args.count} request(s) to ${endpoint.toString()} (delay=${args.delayMs}ms±${args.jitterMs ?? 0}ms, run=${runId})`,
  )

  for (let i = 1; i <= args.count; i += 1) {
    if (args.delayMs > 0 && i > 1) {
      await sleep(delayWithJitter(args.delayMs, args.jitterMs ?? 0))
    }

    const requestHeaders = { ...headers, "X-Visits-Test-Index": String(i) }

    if (args.dryRun) {
      console.info(
        `[dry-run] ${i}/${args.count} POST ${endpoint.toString()} body=${redactedBody}`,
      )
      continue
    }

    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: requestHeaders,
      body,
      keepalive: true,
      signal: AbortSignal.timeout(args.timeoutMs),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      const summary = text ? ` (${text.slice(0, 200)})` : ""
      throw new Error(
        `Request ${i}/${args.count} failed: ${response.status}${summary}`,
      )
    }

    console.info(`${i}/${args.count} OK (${response.status})`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
