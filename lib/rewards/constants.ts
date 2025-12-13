const REWARD_FEATURE_DEFINITIONS = {
  priorityPlacement: {
    value: "priorityPlacement",
    label: "Priority placement",
  },
  featured: {
    value: "featured",
    label: "Featured badge",
  },
  sponsoredProducts: {
    value: "sponsoredProducts",
    label: "Sponsored placement",
  },
  stickyBanner: {
    value: "stickyBanner",
    label: "Sticky banner",
  },
  newsletterPromotion: {
    value: "newsletterPromotion",
    label: "Newsletter promotion",
  },
  analyticsAdvanced: {
    value: "analytics.advanced",
    label: "Advanced analytics",
  },
} as const

type RewardFeatureDefinitionRecord = typeof REWARD_FEATURE_DEFINITIONS
type RewardFeatureDefinition =
  RewardFeatureDefinitionRecord[keyof RewardFeatureDefinitionRecord]

export const REWARD_FEATURE_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(REWARD_FEATURE_DEFINITIONS).map(([key, definition]) => [
      key,
      definition.value,
    ]),
  ),
) as {
  readonly [K in keyof RewardFeatureDefinitionRecord]: RewardFeatureDefinitionRecord[K]["value"]
}

export const REWARD_FEATURE_KEY_OPTIONS = Object.freeze(
  Object.values(REWARD_FEATURE_DEFINITIONS),
) as readonly RewardFeatureDefinition[]

export type RewardFeatureKey =
  (typeof REWARD_FEATURE_KEY_OPTIONS)[number]["value"]

export const REWARD_FEATURE_KEYS = Object.freeze(
  REWARD_FEATURE_KEY_OPTIONS.map((option) => option.value),
) as readonly RewardFeatureKey[]

const rewardFeatureKeySet = new Set(REWARD_FEATURE_KEYS)

export function isRewardFeatureKey(value: unknown): value is RewardFeatureKey {
  return (
    typeof value === "string" &&
    rewardFeatureKeySet.has(value as RewardFeatureKey)
  )
}
