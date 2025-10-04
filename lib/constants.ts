import { REWARD_FEATURE_KEY } from "./rewards/constants"

export const IS_PROD = process.env.NODE_ENV === "production"
export const HAS_APP_URL = Boolean(process.env.NEXT_PUBLIC_APP_URL)

export const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? ""

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
]

export const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "JPY",
  "INR",
] as const

export const CURRENCIES: {
  code: (typeof CURRENCY_CODES)[number]
  label: string
}[] = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "INR", label: "Indian Rupee (₹)" },
]

export const PLATFORMS = [
  "web",
  "ios",
  "android",
  "mac",
  "windows",
  "linux",
  "chrome_extension",
  "firefox_extension",
] as const

export type PlatformCode = (typeof PLATFORMS)[number]

export const PLAN_FEATURE_KEYS = [
  "analytics.basic",
  "product.sitemap",
  REWARD_FEATURE_KEY.featured,
  REWARD_FEATURE_KEY.priorityPlacement,
  REWARD_FEATURE_KEY.homepage,
  REWARD_FEATURE_KEY.stickyBanner,
  REWARD_FEATURE_KEY.customCTA,
  "earlyAccess",
  REWARD_FEATURE_KEY.newsletterPromotion,
  "backlink",
  "organization",
  REWARD_FEATURE_KEY.insightsPipeline,
] as const

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number]

export const INSIGHTS_PIPELINE_FEATURE_KEY =
  REWARD_FEATURE_KEY.insightsPipeline
