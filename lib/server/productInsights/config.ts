const DEFAULT_SUBREDDIT_MODEL = "gpt-4.1-mini"
const DEFAULT_SUBREDDIT_RELEVANCE_MODEL = "gpt-4.1-mini"
const DEFAULT_DISCUSSION_QUERY_MODEL = "gpt-4.1"
const DEFAULT_DISCUSSION_INSIGHT_MODEL = "gpt-4.1-mini"
const DEFAULT_COMPETITOR_MODEL = "gpt-4.1-mini"
const DEFAULT_PRODUCT_HUNT_INDEX = "Post_production"

const PRODUCT_HUNT_APP_ID_FALLBACK = "0H4SMABBSG"
const PRODUCT_HUNT_SEARCH_KEY_FALLBACK = "9670d2d619b9d07859448d7628eea5f3"

export function getProductInsightSubredditModel(): string {
  const envName =
    process.env.PRODUCT_INSIGHT_SUBREDDIT_MODEL?.trim() ||
    process.env.PRODUCT_IDEA_SUBREDDIT_MODEL?.trim()
  return envName || DEFAULT_SUBREDDIT_MODEL
}

export function getProductInsightSubredditRelevanceModel(): string {
  const envName =
    process.env.PRODUCT_INSIGHT_SUBREDDIT_RELEVANCE_MODEL?.trim() ||
    process.env.PRODUCT_IDEA_SUBREDDIT_RELEVANCE_MODEL?.trim()
  return envName || DEFAULT_SUBREDDIT_RELEVANCE_MODEL
}

export function getProductInsightDiscussionQueryModel(): string {
  const envName =
    process.env.PRODUCT_INSIGHT_DISCUSSION_QUERY_MODEL?.trim() ||
    process.env.PRODUCT_IDEA_DISCUSSION_QUERY_MODEL?.trim()
  return envName || DEFAULT_DISCUSSION_QUERY_MODEL
}

export function getProductInsightDiscussionInsightModel(): string {
  const envName =
    process.env.PRODUCT_INSIGHT_DISCUSSION_INSIGHT_MODEL?.trim() ||
    process.env.PRODUCT_IDEA_DISCUSSION_INSIGHT_MODEL?.trim()
  return envName || DEFAULT_DISCUSSION_INSIGHT_MODEL
}

export function getProductInsightCompetitorModel(): string {
  const envName =
    process.env.PRODUCT_INSIGHT_COMPETITOR_MODEL?.trim() ||
    process.env.PRODUCT_IDEA_COMPETITOR_MODEL?.trim()
  return envName || DEFAULT_COMPETITOR_MODEL
}

export function getProductHuntAppId(): string | null {
  const value = process.env.PRODUCT_HUNT_APP_ID?.trim()
  if (value) return value
  return process.env.NODE_ENV === "development"
    ? PRODUCT_HUNT_APP_ID_FALLBACK
    : null
}

export function getProductHuntSearchKey(): string | null {
  const value = process.env.PRODUCT_HUNT_SEARCH_KEY?.trim()
  if (value) return value
  return process.env.NODE_ENV === "development"
    ? PRODUCT_HUNT_SEARCH_KEY_FALLBACK
    : null
}

export function getProductHuntIndexName(): string {
  return (
    process.env.PRODUCT_HUNT_INDEX_NAME?.trim() || DEFAULT_PRODUCT_HUNT_INDEX
  )
}

export function getProductInsightDiscussionModelLabel(): string {
  const query = getProductInsightDiscussionQueryModel()
  const insight = getProductInsightDiscussionInsightModel()
  return insight && insight !== query ? `${query} → ${insight}` : query
}

export function getProductInsightSubredditModelLabel(): string {
  const primary = getProductInsightSubredditModel()
  const relevance = getProductInsightSubredditRelevanceModel()
  return relevance && relevance !== primary
    ? `${primary} → ${relevance}`
    : primary
}

export const DEFAULT_PUBLIC_SUBREDDIT_MODEL = DEFAULT_SUBREDDIT_MODEL
export const DEFAULT_PUBLIC_DISCUSSION_MODEL = `${DEFAULT_DISCUSSION_QUERY_MODEL} → ${DEFAULT_DISCUSSION_INSIGHT_MODEL}`
