import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
vi.mock("@/actions/public/plans/actions", () => ({
  getPublicPlans: async () => [],
}))
import { LaunchChannelComparisonContent } from "@/components/organisms/LaunchChannelComparison"
import {
  getReviewedLaunchChannels,
  isReviewedLaunchComparison,
  LAUNCH_CHANNELS,
} from "@/lib/launch-channels/catalog"
import type { PublicPlan } from "@/actions/public/plans/actions"

const plans = [
  {
    id: "free",
    name: "Free",
    slug: "free",
    type: "one_time_price",
    price: 0,
    features: [],
    boostForDays: 1,
  },
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    type: "one_time_price",
    price: 9700,
    discount: 10,
    boostForDays: 21,
    features: [
      {
        id: "advanced",
        name: "Advanced analytics",
        key: "analytics.advanced",
        enabled: true,
      },
    ],
  },
] as unknown as PublicPlan[]

describe("reviewed launch channels", () => {
  it("excludes drafts and unsourced claims from reviewed comparisons", () => {
    const reviewed = LAUNCH_CHANNELS[0]
    expect(
      getReviewedLaunchChannels([
        reviewed,
        { ...reviewed, slug: "draft", editorialStatus: "draft" },
        { ...reviewed, slug: "unsourced", sources: [] },
      ]).map((item) => item.slug),
    ).toEqual(["product-hunt"])
    expect(isReviewedLaunchComparison("product-hunt")).toBe(true)
    expect(isReviewedLaunchComparison("unreviewed")).toBe(false)
  })
  it("shows selection criteria, sources, dates, costs and unknowns without maker inventory", () => {
    const html = renderToStaticMarkup(
      <LaunchChannelComparisonContent plans={plans} />,
    )
    const document = new DOMParser().parseFromString(html, "text/html")
    const text = document.body.textContent!
    for (const channel of getReviewedLaunchChannels()) {
      expect(text).toContain(channel.name)
      expect(text).toContain(channel.verifiedAt)
      for (const source of channel.sources)
        expect(document.querySelector(`a[href="${source.url}"]`)).not.toBeNull()
    }
    expect(text).toContain(
      "Maker mappings, votes, and sponsorship do not select",
    )
    expect(text).toContain("not verified")
    expect(text).toContain("$87.30")
    expect(text).toContain("21 days")
    expect(text).toContain("AI crawler, device, browser & location insights")
    expect(
      document.querySelector('a[href="/member/products/add"]'),
    ).not.toBeNull()
    expect(text).not.toMatch(/1\.9M|123\.3K/)
  })
  it("keeps the comparison useful without fabricating missing Shipyard plan values", () => {
    const html = renderToStaticMarkup(
      <LaunchChannelComparisonContent plans={[]} />,
    )
    expect(html).toContain("current plan catalog is unavailable")
    expect(html).not.toContain("$87.30")
    expect(html).toContain("BetaList")
  })
})
