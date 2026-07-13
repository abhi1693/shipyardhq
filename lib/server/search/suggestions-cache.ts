import { buildCacheKey, invalidateCacheByPrefix } from "@/lib/server/cache"

const SEARCH_SUGGESTIONS_CACHE_VERSION = "v4"
const SEARCH_SUGGESTIONS_CACHE_PREFIX = buildCacheKey(
  "search",
  "suggestions",
  SEARCH_SUGGESTIONS_CACHE_VERSION,
)

export function buildSearchSuggestionsCacheKey(query: string) {
  return buildCacheKey(
    "search",
    "suggestions",
    SEARCH_SUGGESTIONS_CACHE_VERSION,
    query.toLowerCase(),
  )
}

export async function invalidateSearchSuggestionsCache(reason = "manual") {
  const result = await invalidateCacheByPrefix({
    keyPrefix: SEARCH_SUGGESTIONS_CACHE_PREFIX,
    onError: (error) => {
      console.error("[search.suggestions] failed to invalidate cache", {
        reason,
        error,
      })
    },
  })

  console.info("[search.suggestions] cache invalidated", { reason, result })
  return result
}
