const DEFAULT_SUBREDDIT_MODEL = "gpt-4.1-mini"
const DEFAULT_SUBREDDIT_RELEVANCE_MODEL = "gpt-4.1-mini"
const DEFAULT_DISCUSSION_QUERY_MODEL = "gpt-4.1"
const DEFAULT_DISCUSSION_INSIGHT_MODEL = "gpt-4.1-mini"
const DEFAULT_COMPETITOR_MODEL = "gpt-4.1-mini"

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
