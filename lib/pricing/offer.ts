export const PRICING_PLAN_TYPES = ["one_time_price", "recurring_price"] as const

export type PricingPlanType = (typeof PRICING_PLAN_TYPES)[number]

type OfferFeature = {
  id: string
  key: string
  name: string
  displayName?: string | null
  enabled: boolean
}

export type OfferPlan = {
  id: string
  name: string
  slug?: string
  type: PricingPlanType
  price: number
  discount?: number | null
  boostForDays?: number | null
  isDefault?: boolean
  features: OfferFeature[]
}

export type PricingOfferItem = {
  id: string
  label: string
}

const PRO_PLAN_PATTERN = /\bpro\b|enterprise|max/i
const FEATURED_PLAN_PATTERN = /featured/i
const SPOTLIGHT_PLAN_PATTERN = /spotlight/i

const OMITTED_FEATURE_KEYS = new Set(["featured"])

const FEATURE_COPY: Record<string, string[]> = {
  "analytics.basic": [
    "Views, visits, traffic trends & upvotes in your dashboard",
  ],
  "analytics.advanced": ["AI crawler, device, browser & location insights"],
  backlink: ["Direct website link with aggregate click tracking"],
  "product.sitemap": ["Included in Shipyard’s product sitemap"],
  "product.aiSearchReady": [
    "AI-search ready badge + dedicated Markdown profile",
  ],
  priorityPlacement: [
    "Priority position in Browse, alternatives, use-case, platform, pricing-model & product-type results",
  ],
  sponsoredProducts: ["Sponsored card in the homepage launch feed"],
  partnerSpotlight: [
    "Partner Spotlight eligibility in the sitewide bar and product, leaderboard & directory sponsor panels",
  ],
}

const FREE_PLACEMENT_ITEMS: PricingOfferItem[] = [
  {
    id: "free-product-page",
    label: "Public Shipyard product page",
  },
  {
    id: "free-homepage-feed",
    label: "Standard card in the homepage launch feed",
  },
  {
    id: "free-directory-results",
    label: "Standard listing in Browse and matching directory results",
  },
]

export function isFreeOfferPlan(plan: OfferPlan) {
  return plan.price <= 0
}

export function isProOfferPlan(plan: OfferPlan) {
  return PRO_PLAN_PATTERN.test(`${plan.name} ${plan.slug ?? ""}`)
}

function compareMiddlePlans(a: OfferPlan, b: OfferPlan) {
  const aFeatured = FEATURED_PLAN_PATTERN.test(`${a.name} ${a.slug ?? ""}`)
  const bFeatured = FEATURED_PLAN_PATTERN.test(`${b.name} ${b.slug ?? ""}`)
  if (aFeatured !== bFeatured) return aFeatured ? -1 : 1

  const aSpotlight = SPOTLIGHT_PLAN_PATTERN.test(`${a.name} ${a.slug ?? ""}`)
  const bSpotlight = SPOTLIGHT_PLAN_PATTERN.test(`${b.name} ${b.slug ?? ""}`)
  if (aSpotlight !== bSpotlight) return aSpotlight ? -1 : 1

  const aDurationDistance = Math.abs((a.boostForDays ?? 14) - 14)
  const bDurationDistance = Math.abs((b.boostForDays ?? 14) - 14)
  if (aDurationDistance !== bDurationDistance) {
    return aDurationDistance - bDurationDistance
  }

  return a.price - b.price || a.name.localeCompare(b.name)
}

function chooseFreePlan(plans: OfferPlan[]) {
  return [...plans]
    .filter(isFreeOfferPlan)
    .sort(
      (a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)),
    )[0]
}

function chooseMiddlePlan(plans: OfferPlan[]) {
  return [...plans]
    .filter((plan) => !isFreeOfferPlan(plan) && !isProOfferPlan(plan))
    .sort(compareMiddlePlans)[0]
}

function chooseProPlan(plans: OfferPlan[]) {
  return [...plans]
    .filter((plan) => !isFreeOfferPlan(plan) && isProOfferPlan(plan))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))[0]
}

export function resolveInitialPricingPlanType(
  plans: OfferPlan[],
): PricingPlanType {
  const paidPlans = plans.filter((plan) => !isFreeOfferPlan(plan))

  if (paidPlans.some((plan) => plan.type === "one_time_price")) {
    return "one_time_price"
  }

  if (paidPlans.some((plan) => plan.type === "recurring_price")) {
    return "recurring_price"
  }

  return "one_time_price"
}

export function selectPricingOfferPlans<T extends OfferPlan>(
  plans: T[],
  selectedType: PricingPlanType,
): T[] {
  const freePlan = chooseFreePlan(plans) as T | undefined
  const paidPlans = plans.filter(
    (plan) => !isFreeOfferPlan(plan) && plan.type === selectedType,
  )
  const middlePlan = chooseMiddlePlan(paidPlans) as T | undefined
  const proPlan = chooseProPlan(paidPlans) as T | undefined

  return [freePlan, middlePlan, proPlan].filter((plan): plan is T =>
    Boolean(plan),
  )
}

export function resolveRecommendedPlanId(plans: OfferPlan[]) {
  return chooseMiddlePlan(plans)?.id ?? chooseProPlan(plans)?.id
}

export function getDiscountedPriceCents(plan: OfferPlan) {
  const discount = Math.min(Math.max(plan.discount ?? 0, 0), 100)

  if (discount <= 0 || discount >= 100) return plan.price
  return Math.round(plan.price * (1 - discount / 100))
}

export function formatPricingOfferPrice(cents: number) {
  const usesCents = Math.abs(cents) % 100 !== 0

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usesCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function getPricingPlanCtaLabel(plan: OfferPlan) {
  if (isFreeOfferPlan(plan)) return "Launch free"

  const duration = Math.max(1, Math.round(plan.boostForDays ?? 1))
  const price = formatPricingOfferPrice(getDiscountedPriceCents(plan))

  if (isProOfferPlan(plan)) {
    return `Get ${duration} days + advanced insights — ${price}`
  }

  return `Boost my launch for ${duration} day${duration === 1 ? "" : "s"} — ${price}`
}

export function getPricingPlanDescription(plan: OfferPlan) {
  if (isFreeOfferPlan(plan)) {
    return "Publish a permanent listing and start measuring discovery."
  }

  const duration = Math.max(1, Math.round(plan.boostForDays ?? 1))
  if (isProOfferPlan(plan)) {
    return `${duration} days of maximum reach with deeper attribution.`
  }

  return `${duration} days of focused visibility across Shipyard discovery.`
}

function getEnabledFeatureKeys(plan?: OfferPlan) {
  return new Set(
    plan?.features
      .filter((feature) => feature.enabled)
      .map((feature) => feature.key) ?? [],
  )
}

function featureItemsForPlan(plan: OfferPlan, baseline?: OfferPlan) {
  const baselineKeys = getEnabledFeatureKeys(baseline)

  return plan.features
    .filter(
      (feature) =>
        feature.enabled &&
        !baselineKeys.has(feature.key) &&
        !OMITTED_FEATURE_KEYS.has(feature.key),
    )
    .flatMap((feature) => {
      const labels = FEATURE_COPY[feature.key] ?? [
        feature.displayName || feature.name,
      ]

      return labels.map((label, index) => ({
        id: `${feature.id}-${index}`,
        label,
      }))
    })
}

export function getPricingOfferPresentation(
  plan: OfferPlan,
  displayedPlans: OfferPlan[],
): {
  intro: string
  items: PricingOfferItem[]
} {
  if (isFreeOfferPlan(plan)) {
    return {
      intro: "Included with every launch",
      items: [
        ...FREE_PLACEMENT_ITEMS,
        ...featureItemsForPlan(plan).filter(
          (item) => !item.label.includes("product sitemap"),
        ),
        {
          id: "free-sitemap",
          label: "Included in Shipyard’s product sitemap",
        },
      ],
    }
  }

  if (isProOfferPlan(plan)) {
    const featuredPlan = chooseMiddlePlan(displayedPlans)
    return {
      intro: "Everything in Featured, plus…",
      items: featureItemsForPlan(plan, featuredPlan),
    }
  }

  const freePlan = chooseFreePlan(displayedPlans)
  return {
    intro: "Everything in Free, plus…",
    items: featureItemsForPlan(plan, freePlan),
  }
}
