export const HOMEPAGE_FEED_VIEWS = [
  "new",
  "verified-revenue",
  "most-clicked",
] as const

export type HomepageFeedView = (typeof HOMEPAGE_FEED_VIEWS)[number]

export const DEFAULT_HOMEPAGE_FEED_VIEW: HomepageFeedView = "new"

export const HOMEPAGE_FEED_VIEW_LABELS: Record<HomepageFeedView, string> = {
  new: "New",
  "verified-revenue": "Verified revenue",
  "most-clicked": "Most clicked",
}

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
