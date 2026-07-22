import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import type { PublicPlan } from "@/actions/public/plans/actions"
import { PricingTable } from "@/components/organisms/PricingTable"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const ALL_FEATURE_KEYS = [
  "analytics.basic",
  "analytics.advanced",
  "backlink",
  "featured",
  "partnerSpotlight",
  "priorityPlacement",
  "product.aiSearchReady",
  "product.sitemap",
  "sponsoredProducts",
] as const

function buildPlan({
  name,
  slug,
  type,
  price,
  boostForDays,
  enabledFeatureKeys,
  isDefault = false,
  priceSuffix,
}: {
  name: string
  slug: string
  type: PublicPlan["type"]
  price: number
  boostForDays: number
  enabledFeatureKeys: string[]
  isDefault?: boolean
  priceSuffix?: string
}): PublicPlan {
  const enabled = new Set(enabledFeatureKeys)

  return {
    id: slug,
    name,
    slug,
    description: null,
    type,
    price,
    discount: null,
    boostForDays,
    isDefault,
    externalId: price > 0 ? `external-${slug}` : null,
    paymentFrequencyCount: undefined,
    paymentFrequencyInterval: undefined,
    subscriptionPeriodCount: undefined,
    subscriptionPeriodInterval: undefined,
    priceSuffix,
    productCount: 0,
    features: ALL_FEATURE_KEYS.map((key) => ({
      id: `${slug}-${key}`,
      key,
      name: key,
      displayName: key,
      description: key,
      enabled: enabled.has(key),
      isExperimental: false,
    })),
  }
}

const freeFeatures = ["analytics.basic", "product.sitemap"]
const featuredFeatures = [
  ...freeFeatures,
  "backlink",
  "featured",
  "priorityPlacement",
  "sponsoredProducts",
]
const proFeatures = [
  ...featuredFeatures,
  "analytics.advanced",
  "partnerSpotlight",
  "product.aiSearchReady",
]

const productionPlans: PublicPlan[] = [
  buildPlan({
    name: "Free",
    slug: "free",
    type: "one_time_price",
    price: 0,
    boostForDays: 1,
    enabledFeatureKeys: freeFeatures,
    isDefault: true,
  }),
  buildPlan({
    name: "Spotlight",
    slug: "spotlight",
    type: "one_time_price",
    price: 499,
    boostForDays: 7,
    enabledFeatureKeys: [
      ...freeFeatures,
      "backlink",
      "featured",
      "sponsoredProducts",
    ],
  }),
  buildPlan({
    name: "Featured",
    slug: "featured",
    type: "one_time_price",
    price: 999,
    boostForDays: 14,
    enabledFeatureKeys: featuredFeatures,
  }),
  buildPlan({
    name: "Featured",
    slug: "featured-recurring",
    type: "recurring_price",
    price: 899,
    boostForDays: 14,
    enabledFeatureKeys: featuredFeatures,
    priceSuffix: "per 14 days",
  }),
  buildPlan({
    name: "Pro",
    slug: "pro",
    type: "one_time_price",
    price: 2499,
    boostForDays: 30,
    enabledFeatureKeys: proFeatures,
  }),
  buildPlan({
    name: "Pro",
    slug: "pro-recurring",
    type: "recurring_price",
    price: 2499,
    boostForDays: 30,
    enabledFeatureKeys: proFeatures,
    priceSuffix: "per month",
  }),
]

describe("PricingTable", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
    }
    container?.remove()
    root = null
    container = null
  })

  it("wires the production catalog into the three-tier offer", () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <PricingTable
          plans={productionPlans}
          showTypeToggle
          cardVariant="placement"
          disableSectionWrapper
        />,
      )
    })

    const oneTimeTab = container.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"]',
    )
    const recurringTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).find((button) => button.textContent === "Keep my placement running")

    expect(oneTimeTab).toHaveTextContent("One-time launch boost")
    expect(recurringTab).toHaveAttribute("aria-selected", "false")
    expect(container).toHaveTextContent("Launch free")
    expect(container).toHaveTextContent("Boost my launch for 14 days — $9.99")
    expect(container).toHaveTextContent(
      "Get 30 days + advanced insights — $24.99",
    )
    const proCta = Array.from(container.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("advanced insights"),
    )
    expect(proCta).toHaveClass("whitespace-normal", "has-[>svg]:px-4")
    expect(proCta?.querySelector("span")).toHaveTextContent(
      "Get 30 days + advanced insights — $24.99",
    )
    expect(container).not.toHaveTextContent(
      "Boost my launch for 7 days — $4.99",
    )
    expect(container).toHaveTextContent("Recommended")
    expect(container).not.toHaveTextContent(/Most Popular/i)
    expect(container).toHaveTextContent("Everything in Featured, plus…")

    act(() => recurringTab?.click())

    expect(recurringTab).toHaveAttribute("aria-selected", "true")
    expect(container).toHaveTextContent("Launch free")
    expect(container).toHaveTextContent("Boost my launch for 14 days — $8.99")
    expect(container).not.toHaveTextContent(
      "Boost my launch for 14 days — $9.99",
    )
  })
})
