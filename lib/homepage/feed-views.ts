import { pickFirst } from "@/lib/urlParams"

export const HOMEPAGE_FEED_VIEW_PARAM = "view" as const

export const HOMEPAGE_FEED_VIEWS = ["top", "new", "recent"] as const

export type HomepageFeedView = (typeof HOMEPAGE_FEED_VIEWS)[number]

export const DEFAULT_HOMEPAGE_FEED_VIEW: HomepageFeedView = "top"

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

export const resolveHomepageFeedView = (
  searchParams?:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): HomepageFeedView => {
  if (!searchParams) {
    return DEFAULT_HOMEPAGE_FEED_VIEW
  }

  const raw = searchParams[HOMEPAGE_FEED_VIEW_PARAM]
  const candidate = pickFirst(raw)
  return normalizeHomepageFeedView(candidate)
}
