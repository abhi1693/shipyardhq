export const HOMEPAGE_FEED_VIEWS = ["new"] as const

export type HomepageFeedView = (typeof HOMEPAGE_FEED_VIEWS)[number]

export const DEFAULT_HOMEPAGE_FEED_VIEW: HomepageFeedView = "new"

export const isHomepageFeedView = (value: unknown): value is HomepageFeedView =>
  typeof value === "string" &&
  HOMEPAGE_FEED_VIEWS.includes(value as HomepageFeedView)

export const normalizeHomepageFeedView = (
  value: unknown,
  fallback: HomepageFeedView = DEFAULT_HOMEPAGE_FEED_VIEW,
): HomepageFeedView => {
  if (isHomepageFeedView(value)) {
    return value
  }
  return fallback
}
