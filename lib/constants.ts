export const IS_PROD = process.env.NODE_ENV === "production"

export const BADGE_OPTIONS = [
  {
    value: "featured",
    label: "Featured",
    icon: "🔥",
    color: "yellow",
  },
  {
    value: "trending",
    label: "Trending",
    icon: "📈",
    color: "red",
  },
  {
    value: "new",
    label: "New Launch",
    icon: "✨",
    color: "blue",
  },
  {
    value: "editor-pick",
    label: "Editor's Pick",
    icon: "📝",
    color: "purple",
  },
  {
    value: "product-of-day-1",
    label: "Product of the Day #1",
    icon: "🥇",
    color: "yellow",
  },
  {
    value: "product-of-day-2",
    label: "Product of the Day #2",
    icon: "🥈",
    color: "blue",
  },
  {
    value: "product-of-day-3",
    label: "Product of the Day #3",
    icon: "🥉",
    color: "purple",
  },
  {
    value: "product-of-week-1",
    label: "Product of the Week #1",
    icon: "🥇",
    color: "yellow",
  },
  {
    value: "product-of-week-2",
    label: "Product of the Week #2",
    icon: "🥈",
    color: "blue",
  },
  {
    value: "product-of-week-3",
    label: "Product of the Week #3",
    icon: "🥉",
    color: "purple",
  },
  {
    value: "product-of-month-1",
    label: "Product of the Month #1",
    icon: "🥇",
    color: "yellow",
  },
  {
    value: "product-of-month-2",
    label: "Product of the Month #2",
    icon: "🥈",
    color: "blue",
  },
  {
    value: "product-of-month-3",
    label: "Product of the Month #3",
    icon: "🥉",
    color: "purple",
  },
]

export const AI_SEARCH_READY_PLAN_FEATURE_KEY = "product.aiSearchReady"
export const BACKLINK_PLAN_FEATURE_KEY = "backlink"

export const PLAN_FEATURE_KEYS = [
  "analytics.basic",
  BACKLINK_PLAN_FEATURE_KEY,
  "product.sitemap",
  AI_SEARCH_READY_PLAN_FEATURE_KEY,
  "featured",
  "priorityPlacement",
  "sponsoredProducts",
  "partnerSpotlight",
] as const

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number]
