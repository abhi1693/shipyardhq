import { unstable_cache as nextCache } from "next/cache"
import { TAGS, type Tag } from "./tags"

// Default TTLs (seconds) – can be tweaked per function
export const DEFAULT_TTL = {
  fast: 60, // homepage, leaderboard, trending
  medium: 120, // product pages, category pages
  slow: 300, // category lists
  slowest: 3600, // analytics dashboards — hourly refresh is sufficient
} as const

type AnyAsyncFn = (...args: any[]) => Promise<any>

// Create a cached variant of an async function with dynamic tags per-args.
// This pattern re-creates the inner cache per-call to compute tags based on arguments.
export function cached<F extends AnyAsyncFn>(
  fn: F,
  key: string,
  opts?: {
    ttl?: number
    tags?: (args: Parameters<F>) => Tag[]
    keyParts?: (args: Parameters<F>) => string | string[] | null | undefined
  },
) {
  return (async (...args: Parameters<F>): Promise<ReturnType<F>> => {
    const tags = Array.from(
      new Set([key, ...(opts?.tags ? opts.tags(args) : [])]),
    ) as string[]
    const ttl = opts?.ttl ?? DEFAULT_TTL.fast
    const extraKeyParts = opts?.keyParts?.(args)
    const dynamicKeyParts = Array.isArray(extraKeyParts)
      ? extraKeyParts
      : extraKeyParts != null
        ? [extraKeyParts]
        : []
    const sanitizedKeyParts = dynamicKeyParts
      .map((part) => (part == null ? undefined : String(part)))
      .filter(
        (part): part is string => typeof part === "string" && part.length > 0,
      )
    const keyParts = [key, ...sanitizedKeyParts]
    const inner = nextCache(
      async (...innerArgs: any[]) => fn(...innerArgs),
      keyParts,
      {
        revalidate: ttl,
        tags,
      },
    )
    return inner(...args)
  }) as F
}

export { TAGS }
