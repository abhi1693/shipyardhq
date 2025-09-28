const DEFAULT_SUBREDDIT_MODEL = "gpt-4.1-mini"
const DEFAULT_SUBREDDIT_RELEVANCE_MODEL = "gpt-4.1-mini"
const DEFAULT_DISCUSSION_QUERY_MODEL = "gpt-4.1"
const DEFAULT_DISCUSSION_INSIGHT_MODEL = "gpt-4.1-mini"

function readEnvVar(name: string, fallback: string): string {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = raw.trim()
  return value || fallback
}

export function getProductIdeaSubredditModel(): string {
  return readEnvVar("PRODUCT_IDEA_SUBREDDIT_MODEL", DEFAULT_SUBREDDIT_MODEL)
}

export function getProductIdeaSubredditRelevanceModel(): string {
  return readEnvVar(
    "PRODUCT_IDEA_SUBREDDIT_RELEVANCE_MODEL",
    DEFAULT_SUBREDDIT_RELEVANCE_MODEL,
  )
}

export function getProductIdeaDiscussionQueryModel(): string {
  return readEnvVar(
    "PRODUCT_IDEA_DISCUSSION_QUERY_MODEL",
    DEFAULT_DISCUSSION_QUERY_MODEL,
  )
}

export function getProductIdeaDiscussionInsightModel(): string {
  return readEnvVar(
    "PRODUCT_IDEA_DISCUSSION_INSIGHT_MODEL",
    DEFAULT_DISCUSSION_INSIGHT_MODEL,
  )
}

export function getProductIdeaDiscussionModelLabel(): string {
  const query = getProductIdeaDiscussionQueryModel()
  const insight = getProductIdeaDiscussionInsightModel()
  return insight && insight !== query ? `${query} → ${insight}` : query
}

export function getProductIdeaSubredditModelLabel(): string {
  const primary = getProductIdeaSubredditModel()
  const relevance = getProductIdeaSubredditRelevanceModel()
  return relevance && relevance !== primary ? `${primary} → ${relevance}` : primary
}

export const DEFAULT_PUBLIC_SUBREDDIT_MODEL = DEFAULT_SUBREDDIT_MODEL
export const DEFAULT_PUBLIC_DISCUSSION_MODEL = `${DEFAULT_DISCUSSION_QUERY_MODEL} → ${DEFAULT_DISCUSSION_INSIGHT_MODEL}`
