import { unstable_cache as nextCache } from "next/cache"
import { TAGS, type Tag } from "./tags"

// Default TTLs (seconds) – can be tweaked per function
export const DEFAULT_TTL = {
  fast: 60, // homepage, leaderboard, trending
  medium: 120, // product pages, category pages
  slow: 300, // category lists
  slowest: 3600, // admin analytics dashboards — hourly refresh is sufficient
} as const

export const DEFAULT_SWR = {
  fast: 300, // serve stale responses for up to 5 minutes while refreshing in background
  medium: 600, // public detail pages can tolerate slightly longer stale data
  slow: 900, // broad listings prefer stability over rapid churn
  slowest: 10800, // admin analytics can serve stale data for up to 3 hours
} as const

const ACCELERATE_TAG_LIMIT = 5
const ACCELERATE_TAG_SANITIZE = /[^A-Za-z0-9_]/g

export function accelerateTags(input: string[]): string[] {
  const unique = new Set<string>()
  for (const raw of input) {
    if (!raw) continue
    const sanitized = raw.replace(ACCELERATE_TAG_SANITIZE, "_").slice(0, 64)
    if (!sanitized) continue
    if (!unique.has(sanitized)) {
      unique.add(sanitized)
      if (unique.size >= ACCELERATE_TAG_LIMIT) break
    }
  }
  return Array.from(unique)
}

type AnyAsyncFn = (...args: any[]) => Promise<any>

// Create a cached variant of an async function with dynamic tags per-args.
// This pattern re-creates the inner cache per-call to compute tags based on arguments.
export function cached<F extends AnyAsyncFn>(
  fn: F,
  key: string,
  opts?: {
    ttl?: number
    tags?: (args: Parameters<F>) => Tag[]
  },
) {
  return (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    const tags = Array.from(
      new Set([key, ...(opts?.tags ? opts.tags(args) : [])]),
    ) as string[]
    const ttl = opts?.ttl ?? DEFAULT_TTL.fast
    const inner = nextCache(
      async (...innerArgs: any[]) => fn(...innerArgs),
      [key],
      {
        revalidate: ttl,
        tags,
      },
    )
    return inner(...args)
  }) as F
}

export { TAGS }
