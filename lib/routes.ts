export const HOME_PATH = "/" as const

export const MEMBER_BASE_PATH = "/member" as const
export const MEMBER_OVERVIEW_PATH = `${MEMBER_BASE_PATH}/overview` as const
export const MEMBER_FEEDBACK_PATH = `${MEMBER_BASE_PATH}/feedback` as const
export const MEMBER_ONBOARDING_PATH = `${MEMBER_BASE_PATH}/onboarding` as const
export const MEMBER_ACCOUNT_PROFILE_PATH =
  `${MEMBER_BASE_PATH}/account/profile` as const

export const MEMBER_PRODUCTS_PATH = `${MEMBER_BASE_PATH}/products` as const
export const MEMBER_PRODUCTS_ADD_PATH = `${MEMBER_PRODUCTS_PATH}/add` as const

export const MEMBER_ORGANIZATIONS_PATH =
  `${MEMBER_BASE_PATH}/organizations` as const
export const MEMBER_ORGANIZATIONS_ADD_PATH =
  `${MEMBER_ORGANIZATIONS_PATH}/add` as const

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

export const BROWSE_PATH = "/browse" as const
export const LEADERBOARD_PATH = "/leaderboard" as const
export const LEADERBOARD_MONTHLY_PATH = `${LEADERBOARD_PATH}/monthly` as const
export const LEADERBOARD_GUIDE_PATH = `${LEADERBOARD_PATH}/about` as const

const MONTH_KEY_PATTERN = /^(?:\d{4}-(?:0[1-9]|1[0-2]))$/

export const isMonthKey = (value?: string | null): value is string =>
  typeof value === "string" && MONTH_KEY_PATTERN.test(value)

export const monthlyLeaderboardArchivePath = (monthKey: string) => {
  if (!isMonthKey(monthKey)) {
    throw new Error(`Invalid monthly leaderboard key: ${monthKey}`)
  }
  return `${LEADERBOARD_PATH}/${monthKey}`
}

export const PRICING_PATH = "/pricing" as const
export const WHY_SHIPYARD_PATH = "/why-shipyard" as const
export const ANALYTICS_PATH = "/analytics" as const
export const USE_CASES_PATH = "/use-cases" as const
export const CATEGORIES_PATH = "/categories" as const
export const USERS_PATH = "/users" as const

export const SHIPYARD_TWITTER_URL = "https://x.com/shipyardhq" as const

export const categoryPath = (slug: string) => `${CATEGORIES_PATH}/${slug}`
export const usecasePath = (slug: string) => `${USE_CASES_PATH}/${slug}`
export const productPath = (slug: string) => `/products/${slug}`
export const userPath = (id: string) => `${USERS_PATH}/${id}`

export const memberProductsStatusPath = (status: string) =>
  `${MEMBER_PRODUCTS_PATH}?status=${status}`

export const memberProductsVerificationPath = (status: string) =>
  `${MEMBER_PRODUCTS_PATH}?verification=${status}`

export const memberProductPath = (slug: string) =>
  `${MEMBER_PRODUCTS_PATH}/${slug}`

export const memberProductOverviewPath = (slug: string) =>
  `${memberProductPath(slug)}/overview`

export const memberProductEditPath = (slug: string) =>
  `${memberProductPath(slug)}/edit`

export const memberProductAnalyticsPath = (slug: string) =>
  `${memberProductPath(slug)}/analytics`

export const memberProductDeletePath = (slug: string) =>
  `${memberProductPath(slug)}/delete`

export const memberOrganizationPath = (organizationId: string) =>
  `${MEMBER_ORGANIZATIONS_PATH}/${organizationId}`

export const memberOrganizationAnalyticsPath = (organizationId: string) =>
  `${memberOrganizationPath(organizationId)}/analytics`

export const memberOrganizationEditPath = (organizationId: string) =>
  `${memberOrganizationPath(organizationId)}/edit`

export const memberOrganizationOwnerPath = (organizationId: string) =>
  `${memberOrganizationPath(organizationId)}/owner`

export const memberOrganizationDeletePath = (organizationId: string) =>
  `${memberOrganizationPath(organizationId)}/delete`

export const memberOrganizationMembersPath = (organizationId: string) =>
  `${memberOrganizationPath(organizationId)}/members`

export const memberOrganizationMemberAddPath = (organizationId: string) =>
  `${memberOrganizationMembersPath(organizationId)}/add`

export const memberOrganizationMemberDeletePath = (
  organizationId: string,
  membershipId: string,
) => `${memberOrganizationMembersPath(organizationId)}/${membershipId}/delete`
