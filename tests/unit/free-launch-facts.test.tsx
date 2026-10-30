import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ApprovedLaunchResults } from "@/components/organisms/ApprovedLaunchResults"
import {
  getApprovedLaunchResults,
  type ApprovedLaunchResult,
} from "@/lib/launch-evidence/catalog"
import { getFreeLaunchSummary, type OfferPlan } from "@/lib/pricing/offer"
import { resolveRedirectUrl, sanitizeRedirectUrl } from "@/lib/auth/redirect"

const plan: OfferPlan = {
  id: "free",
  slug: "free",
  name: "Free",
  type: "one_time_price",
  price: 0,
  features: [
    {
      id: "basic",
      name: "Basic analytics",
      key: "analytics.basic",
      enabled: true,
    },
    { id: "click", name: "Direct links", key: "backlink", enabled: true },
    {
      id: "advanced",
      name: "Advanced",
      key: "analytics.advanced",
      enabled: false,
    },
  ],
}
const result: ApprovedLaunchResult = {
  productName: "Fixture product",
  productSlug: "fixture",
  makerName: "Fixture maker",
  planName: "Free",
  publicApproval: true,
  evidenceUrl: "https://example.com/evidence",
  asOf: "2026-10-30",
  lifetimeWebsiteClicks: 412,
}

afterEach(() => vi.unstubAllEnvs())

describe("free launch facts and public evidence", () => {
  it("derives first-screen discovery and measurement facts from the free offer", () => {
    const summary = getFreeLaunchSummary([plan])!
    expect(summary.items.map((item) => item.id)).toEqual([
      "free-product-page",
      "free-homepage-feed",
      "free-directory-results",
      "basic-0",
      "click-0",
    ])
    expect(
      summary.items.some((item) => item.label.includes("AI crawler")),
    ).toBe(false)
    const withoutMeasurement = getFreeLaunchSummary([
      {
        ...plan,
        features: plan.features.map((feature) => ({
          ...feature,
          enabled: false,
        })),
      },
    ])!
    expect(withoutMeasurement.items).toHaveLength(3)
    expect(getFreeLaunchSummary([])).toBeNull()
  })
  it("keeps unapproved and unsupported results unpublished", () => {
    expect(
      getApprovedLaunchResults([
        result,
        { ...result, publicApproval: false },
        { ...result, evidenceUrl: "" },
        { ...result, asOf: "unknown" },
        { ...result, lifetimeWebsiteClicks: -1 },
      ]),
    ).toEqual([result])
    expect(renderToStaticMarkup(<ApprovedLaunchResults />)).toBe("")
  })
})

describe("submission return destinations", () => {
  it("preserves submission across supported auth query aliases and same-host URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shipyard.test")
    expect(
      resolveRedirectUrl(
        {
          redirect_url:
            "https://shipyard.test/member/products/add?intent=launch",
        },
        "shipyard.test",
      ),
    ).toBe("/member/products/add?intent=launch")
    expect(
      resolveRedirectUrl(
        { redirectUrl: "/member/products/add" },
        "shipyard.test",
      ),
    ).toBe("/member/products/add")
  })
  it.each([
    "//evil.test",
    "/\\evil.test",
    "/%5cevil.test",
    "%2f%2fevil.test",
    "https://evil.test/member/products/add",
    "https://shipyard.test//evil.test",
    "javascript:alert(1)",
    "/member/%00/add",
  ])("rejects unsafe auth return destinations: %s", (value) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shipyard.test")
    expect(sanitizeRedirectUrl(value, "shipyard.test")).toBeUndefined()
  })
})
