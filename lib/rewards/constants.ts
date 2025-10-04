const REWARD_FEATURE_DEFINITIONS = {
  priorityPlacement: {
    value: "priorityPlacement",
    label: "Priority placement",
  },
  featured: {
    value: "featured",
    label: "Featured badge",
  },
  homepage: {
    value: "homepage",
    label: "Homepage placement",
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
  insightsPipeline: {
    value: "insights.pipeline",
    label: "Insights pipeline",
  },
  customCTA: {
    value: "customCTA",
    label: "Custom call-to-action",
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

export type RewardFeatureKeyOption = (typeof REWARD_FEATURE_KEY_OPTIONS)[number]
export type RewardFeatureKey = RewardFeatureKeyOption["value"]

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

export function getRewardFeatureLabel(key: RewardFeatureKey): string {
  const match = REWARD_FEATURE_KEY_OPTIONS.find(
    (option) => option.value === key,
  )
  return match?.label ?? key
}
