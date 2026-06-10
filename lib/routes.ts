export const HOME_PATH = "/" as const

export const MEMBER_BASE_PATH = "/member" as const
export const MEMBER_OVERVIEW_PATH = `${MEMBER_BASE_PATH}/overview` as const
export const MEMBER_FEEDBACK_PATH = `${MEMBER_BASE_PATH}/feedback` as const
export const MEMBER_ONBOARDING_PATH = `${MEMBER_BASE_PATH}/onboarding` as const
export const MEMBER_ACCOUNT_PROFILE_PATH =
  `${MEMBER_BASE_PATH}/account/profile` as const
export const MEMBER_REWARDS_PATH = `${MEMBER_BASE_PATH}/rewards` as const

export const MEMBER_PRODUCTS_PATH = `${MEMBER_BASE_PATH}/products` as const
export const MEMBER_PRODUCTS_ADD_PATH = `${MEMBER_PRODUCTS_PATH}/add` as const

export const ADMIN_BASE_PATH = "/admin" as const

const trimSlashes = (segment: string) => segment.replace(/^\/+|\/+$/g, "")

export const adminPath = (...segments: string[]): string => {
  if (!segments.length) {
    return ADMIN_BASE_PATH
  }
  const sanitized = segments
    .filter((segment) => Boolean(segment?.length))
    .map((segment) => trimSlashes(String(segment)))
    .filter((segment) => segment.length > 0)
  if (!sanitized.length) {
    return ADMIN_BASE_PATH
  }
  return `${ADMIN_BASE_PATH}/${sanitized.join("/")}`
}

export const ADMIN_OVERVIEW_PATH = adminPath("overview")
export const ADMIN_ACCOUNT_PROFILE_PATH = adminPath("account", "profile")

export const adminStatusPath = (segments: string[], status: string) =>
  `${adminPath(...segments)}?status=${status}`

export const ALTERNATIVES_PATH = "/alternatives" as const
export const PLATFORMS_PATH = "/platforms" as const

export const BROWSE_PATH = "/browse" as const
export const LEADERBOARD_PATH = "/leaderboard" as const
export const LEADERBOARD_MONTHLY_PATH = `${LEADERBOARD_PATH}/monthly` as const
export const LEADERBOARD_GUIDE_PATH = `${LEADERBOARD_PATH}/about` as const
export const LEADERBOARD_REWARDS_PATH = `${LEADERBOARD_PATH}/rewards` as const
export const dailyLeaderboardPath = (
  year: string | number,
  month: string | number,
  day: string | number,
) => `${LEADERBOARD_PATH}/daily/${year}/${month}/${day}`
export const weeklyLeaderboardPath = (
  year: string | number,
  week: string | number,
) => `${LEADERBOARD_PATH}/weekly/${year}/${week}`
export const monthlyLeaderboardPath = (
  year: string | number,
  month: string | number,
) => `${LEADERBOARD_MONTHLY_PATH}/${year}/${month}`

const MONTH_KEY_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/

const isValidMonthKey = (value: string): boolean => {
  const match = value.match(MONTH_KEY_PATTERN)
  if (!match) return false
  const day = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const year = Number(match[3])
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(year)
  ) {
    return false
  }
  if (monthIndex < 0 || monthIndex > 11) return false
  const candidate = new Date(Date.UTC(year, monthIndex, day))
  if (candidate.getUTCFullYear() !== year) return false
  if (candidate.getUTCMonth() !== monthIndex) return false
  if (candidate.getUTCDate() !== day) return false
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0))
  return candidate.getTime() === monthEnd.getTime()
}

export const isMonthKey = (value?: string | null): value is string =>
  typeof value === "string" && isValidMonthKey(value)

const monthKeyToLeaderboardParts = (monthKey: string) => {
  const match = monthKey.match(MONTH_KEY_PATTERN)
  if (!match) {
    throw new Error(`Invalid monthly leaderboard key: ${monthKey}`)
  }

  return {
    month: Number(match[2]),
    year: Number(match[3]),
  }
}

export const monthlyLeaderboardArchivePath = (monthKey: string) => {
  if (!isMonthKey(monthKey)) {
    throw new Error(`Invalid monthly leaderboard key: ${monthKey}`)
  }
  const { year, month } = monthKeyToLeaderboardParts(monthKey)
  return monthlyLeaderboardPath(year, month)
}

export const PRICING_PATH = "/pricing" as const
export const pricingModelPath = (slug: string) => `${PRICING_PATH}/${slug}`
export const PRODUCT_TYPES_PATH = "/product-types" as const
export const productTypePath = (slug: string) => `${PRODUCT_TYPES_PATH}/${slug}`
export const WHY_SHIPYARD_PATH = "/why-shipyard" as const
export const ANALYTICS_PATH = "/analytics" as const
export const USE_CASES_PATH = "/use-cases" as const
export const CATEGORIES_PATH = "/categories" as const
export const USERS_PATH = "/users" as const
export const TAGS_PATH = "/tags" as const
export const REWARDS_PATH = "/rewards" as const
export const LEGAL_PATH = "/legal" as const
export const LEGAL_PRIVACY_PATH = "/legal/privacy-policy" as const
export const LEGAL_TERMS_PATH = "/legal/terms" as const

export const SHIPYARD_TWITTER_URL = "https://x.com/shipyardhq" as const
export const SHIPYARD_LINKEDIN_URL =
  "https://www.linkedin.com/company/shipyard-hq" as const
export const SHIPYARD_REDDIT_URL =
  "https://www.reddit.com/r/shipyardhq/" as const

export const alternativePath = (slug: string) => `${ALTERNATIVES_PATH}/${slug}`

export const categoryPath = (slug: string) => `${CATEGORIES_PATH}/${slug}`
export const categoryPricingPath = (
  categorySlug: string,
  pricingModel: string,
) => `${categoryPath(categorySlug)}/pricing/${pricingModel}`
export const categoryPlatformPath = (categorySlug: string, platform: string) =>
  `${categoryPath(categorySlug)}/platforms/${platform}`
export const usecasePath = (slug: string) => `${USE_CASES_PATH}/${slug}`
export const tagPath = (slug: string) => `${TAGS_PATH}/${slug}`
export const productPath = (slug: string) => `/products/${slug}`
export const userPath = (id: string) => `${USERS_PATH}/${id}`

export const memberProductsStatusPath = (status: string) =>
  `${MEMBER_PRODUCTS_PATH}?status=${status}`

export const platformPath = (slug: string) => `${PLATFORMS_PATH}/${slug}`
export const memberProductPath = (slug: string) =>
  `${MEMBER_PRODUCTS_PATH}/${slug}`

export const memberProductEditPath = (slug: string) =>
  `${memberProductPath(slug)}/edit`

export const memberProductAnalyticsPath = (slug: string) =>
  `${memberProductPath(slug)}/analytics`

export const memberProductDeletePath = (slug: string) =>
  `${memberProductPath(slug)}/delete`

export const memberProductUpgradePath = (slug: string) =>
  `${memberProductPath(slug)}/upgrade`
