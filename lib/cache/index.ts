import { cacheLife, cacheTag } from "next/cache"
import { TAGS, type Tag } from "./tags"

// Default TTLs (seconds) – can be tweaked per function
export const DEFAULT_TTL = {
  fast: 60, // homepage, leaderboard, trending
  medium: 120, // product pages, category pages
  slow: 300, // category lists
  slowest: 3600,
} as const

export function applyCache(tags: Tag[], ttl: number = DEFAULT_TTL.fast) {
  cacheTag(...Array.from(new Set(tags)).filter(isStringTag))
  cacheLife({
    stale: ttl,
    revalidate: ttl,
  })
}

function isStringTag(tag: Tag): tag is string {
  return typeof tag === "string"
}

export { TAGS }
