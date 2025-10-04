export const REWARD_FEATURE_KEY_OPTIONS = [
  { value: "priorityPlacement", label: "Priority placement" },
  { value: "featured", label: "Featured badge" },
  { value: "homepage", label: "Homepage placement" },
  { value: "stickyBanner", label: "Sticky banner" },
  { value: "newsletterPromotion", label: "Newsletter promotion" },
  { value: "analytics.advanced", label: "Advanced analytics" },
  { value: "insights.pipeline", label: "Insights pipeline" },
  { value: "customCTA", label: "Custom call-to-action" },
] as const

export type RewardFeatureKeyOption =
  (typeof REWARD_FEATURE_KEY_OPTIONS)[number]
export type RewardFeatureKey = RewardFeatureKeyOption["value"]

export const REWARD_FEATURE_KEYS = Object.freeze(
  REWARD_FEATURE_KEY_OPTIONS.map((option) => option.value),
) as readonly RewardFeatureKey[]

const rewardFeatureKeySet = new Set(REWARD_FEATURE_KEYS)

export function isRewardFeatureKey(value: unknown): value is RewardFeatureKey {
  return typeof value === "string" && rewardFeatureKeySet.has(value as RewardFeatureKey)
}

export function getRewardFeatureLabel(key: RewardFeatureKey): string {
  const match = REWARD_FEATURE_KEY_OPTIONS.find((option) => option.value === key)
  return match?.label ?? key
}
