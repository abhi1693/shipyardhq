import { unstable_cache as nextCache } from "next/cache"
import { TAGS, type Tag } from "./tags"

// Default TTLs (seconds) – can be tweaked per function
export const DEFAULT_TTL = {
  fast: 60, // homepage, leaderboard, trending
  medium: 120, // product pages, category pages
  slow: 300, // category lists
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
