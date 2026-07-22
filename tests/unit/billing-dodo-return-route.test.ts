import { beforeEach, describe, expect, it, vi } from "vitest"

const returnMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveUserByClerkId: vi.fn(),
  paymentRetrieve: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  fulfillPayment: vi.fn(),
  syncSubscription: vi.fn(),
  refreshCaches: vi.fn(),
  verifyPlanChangePayment: vi.fn(),
  productFindFirst: vi.fn(),
  planFindUnique: vi.fn(),
  grantFindFirst: vi.fn(),
  grantFindUnique: vi.fn(),
}))

vi.mock("@clerk/nextjs/server", () => ({ auth: returnMocks.auth }))
vi.mock("@/lib/dodo", () => ({
  dodoClient: {
    payments: { retrieve: returnMocks.paymentRetrieve },
    subscriptions: { retrieve: returnMocks.subscriptionRetrieve },
  },
}))
vi.mock("@/lib/server/productPlanGrants", () => ({
  fulfillDodoOneTimePayment: returnMocks.fulfillPayment,
  syncDodoSubscriptionGrant: returnMocks.syncSubscription,
  UNVERIFIED_SUBSCRIPTION_PLAN_CHANGE_REASON:
    "subscription_plan_change_unverified",
}))
vi.mock("@/lib/server/productPlanGrantCache", () => ({
  refreshProductPlanGrantCaches: returnMocks.refreshCaches,
}))
vi.mock("@/lib/server/dodoSubscriptionPayments", () => ({
  hasVerifiedDodoSubscriptionPlanChangePayment:
    returnMocks.verifyPlanChangePayment,
}))
vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: returnMocks.getActiveUserByClerkId,
}))
vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findFirst: returnMocks.productFindFirst },
    plan: { findUnique: returnMocks.planFindUnique },
    productPlanGrant: {
      findFirst: returnMocks.grantFindFirst,
      findUnique: returnMocks.grantFindUnique,
    },
  },
}))

import { GET } from "@/app/api/billing/dodo/return/route"

const PRODUCT_ID = "product_1"
const PLAN_ID = "plan_pro"

function returnRequest(query: string) {
  return new Request(`https://shipyardhq.com/api/billing/dodo/return?${query}`)
}

describe("Dodo billing return route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    returnMocks.auth.mockResolvedValue({ userId: "clerk_1" })
    returnMocks.getActiveUserByClerkId.mockResolvedValue({ id: "user_1" })
    returnMocks.paymentRetrieve.mockResolvedValue({
      payment_id: "pay_1",
      status: "succeeded",
      metadata: { productId: PRODUCT_ID, planId: PLAN_ID },
    })
    returnMocks.fulfillPayment.mockResolvedValue({
      outcome: "recorded",
      productId: PRODUCT_ID,
      grantId: "grant_1",
      grantChanged: true,
      projectionChanged: false,
    })
    returnMocks.refreshCaches.mockResolvedValue(undefined)
    returnMocks.productFindFirst.mockResolvedValue({ slug: "shipyard" })
    returnMocks.grantFindFirst.mockResolvedValue(null)
    returnMocks.grantFindUnique.mockResolvedValue({ planId: PLAN_ID })
    returnMocks.verifyPlanChangePayment.mockResolvedValue(false)
    returnMocks.planFindUnique.mockResolvedValue({ id: PLAN_ID })
  })

  it("preserves product and expected-plan correlation while fulfillment is processing", async () => {
    const response = await GET(
      returnRequest(
        `productId=${PRODUCT_ID}&planId=tampered_plan&payment_id=pay_1`,
      ),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(response.status).toBe(307)
    expect(location.pathname).toBe("/member/products/shipyard")
    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.get("billingProductId")).toBe(PRODUCT_ID)
    expect(location.searchParams.get("billingPlanId")).toBe(PLAN_ID)
    expect(location.searchParams.get("billingToken")).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("redirects active fulfillment with owned correlation for client verification", async () => {
    returnMocks.grantFindFirst.mockResolvedValueOnce({ id: "grant_1" })

    const response = await GET(
      returnRequest(
        `productId=${PRODUCT_ID}&planId=${PLAN_ID}&payment_id=pay_1`,
      ),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.searchParams.get("billing")).toBe("success")
    expect(location.searchParams.get("billingProductId")).toBe(PRODUCT_ID)
    expect(location.searchParams.get("billingPlanId")).toBe(PLAN_ID)
    expect(location.searchParams.get("billingToken")).toBeTruthy()
  })

  it("never redirects a customer to an incoming or configured bind address", async () => {
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = "http://0.0.0.0:3000"
    returnMocks.grantFindFirst.mockResolvedValueOnce({ id: "grant_1" })

    try {
      const response = await GET(
        new Request(
          `http://0.0.0.0:3000/api/billing/dodo/return?productId=${PRODUCT_ID}&planId=${PLAN_ID}&payment_id=pay_1`,
        ),
      )
      const location = new URL(response.headers.get("location") ?? "")

      expect(location.origin).toBe("https://shipyardhq.dev")
      expect(location.pathname).toBe("/member/products/shipyard")
      expect(location.searchParams.get("billing")).toBe("success")
    } finally {
      if (configuredAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL
      } else {
        process.env.NEXT_PUBLIC_APP_URL = configuredAppUrl
      }
    }
  })

  it("falls back to correlated polling when cache refresh fails after the grant commits", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    returnMocks.refreshCaches.mockRejectedValueOnce(
      new Error("cache service unavailable"),
    )

    const response = await GET(
      returnRequest(
        `productId=${PRODUCT_ID}&planId=${PLAN_ID}&payment_id=pay_1`,
      ),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.get("billingProductId")).toBe(PRODUCT_ID)
    expect(location.searchParams.get("billingPlanId")).toBe(PLAN_ID)
    expect(returnMocks.grantFindFirst).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it("keeps an unverified subscription change correlated to the provider target plan", async () => {
    returnMocks.subscriptionRetrieve.mockResolvedValueOnce({
      subscription_id: "sub_1",
      status: "active",
      product_id: "dodo_pro",
      metadata: { productId: PRODUCT_ID, planId: "plan_featured" },
    })
    returnMocks.syncSubscription.mockResolvedValueOnce({
      outcome: "duplicate",
      reason: "subscription_plan_change_unverified",
      productId: PRODUCT_ID,
      grantId: "grant_featured",
      grantChanged: false,
      projectionChanged: false,
    })

    const response = await GET(
      returnRequest(`productId=${PRODUCT_ID}&subscription_id=sub_1`),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.get("billingPlanId")).toBe(PLAN_ID)
    expect(returnMocks.planFindUnique).toHaveBeenCalledWith({
      where: { externalId: "dodo_pro" },
      select: { id: true },
    })
    expect(returnMocks.grantFindFirst).not.toHaveBeenCalled()
  })

  it("never falls back to the old plan when the provider target is unmapped", async () => {
    returnMocks.subscriptionRetrieve.mockResolvedValueOnce({
      subscription_id: "sub_1",
      status: "active",
      product_id: "dodo_unknown",
      metadata: { productId: PRODUCT_ID, planId: "plan_featured" },
    })
    returnMocks.planFindUnique.mockResolvedValueOnce(null)
    returnMocks.syncSubscription.mockResolvedValueOnce({
      outcome: "invalid",
      reason: "provider_subscription_plan_not_found",
      productId: PRODUCT_ID,
      grantId: "grant_featured",
      grantChanged: false,
      projectionChanged: false,
    })

    const response = await GET(
      returnRequest(
        `productId=${PRODUCT_ID}&planId=plan_featured&subscription_id=sub_1`,
      ),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.has("billingProductId")).toBe(false)
    expect(location.searchParams.has("billingPlanId")).toBe(false)
    expect(returnMocks.grantFindFirst).not.toHaveBeenCalled()
  })

  it("clears the old plan before a provider target lookup fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    returnMocks.subscriptionRetrieve.mockResolvedValueOnce({
      subscription_id: "sub_1",
      status: "active",
      product_id: "dodo_pro",
      metadata: { productId: PRODUCT_ID, planId: "plan_featured" },
    })
    returnMocks.planFindUnique.mockRejectedValueOnce(
      new Error("catalog lookup unavailable"),
    )

    const response = await GET(
      returnRequest(
        `productId=${PRODUCT_ID}&planId=plan_featured&subscription_id=sub_1`,
      ),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.has("billingProductId")).toBe(false)
    expect(location.searchParams.has("billingPlanId")).toBe(false)
    expect(returnMocks.syncSubscription).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it("never treats an invalid fulfillment result's old active grant as success", async () => {
    returnMocks.fulfillPayment.mockResolvedValueOnce({
      outcome: "invalid",
      reason: "provider_plan_not_found",
      productId: PRODUCT_ID,
      grantId: "grant_old",
      grantChanged: false,
      projectionChanged: false,
    })
    returnMocks.grantFindFirst.mockResolvedValueOnce({ id: "grant_old" })

    const response = await GET(
      returnRequest(
        `productId=${PRODUCT_ID}&planId=${PLAN_ID}&payment_id=pay_1`,
      ),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.has("billingProductId")).toBe(false)
    expect(location.searchParams.has("billingPlanId")).toBe(false)
    expect(returnMocks.grantFindFirst).not.toHaveBeenCalled()
  })

  it("never echoes foreign provider metadata into the member redirect", async () => {
    returnMocks.paymentRetrieve.mockResolvedValueOnce({
      payment_id: "pay_foreign",
      status: "succeeded",
      metadata: {
        productId: "product_foreign",
        planId: "plan_foreign",
      },
    })
    returnMocks.fulfillPayment.mockResolvedValueOnce({
      outcome: "invalid",
      reason: "product_not_owned",
      productId: "product_foreign",
      grantChanged: false,
      projectionChanged: false,
    })
    returnMocks.productFindFirst.mockResolvedValueOnce(null)

    const response = await GET(
      returnRequest("productId=product_foreign&payment_id=pay_foreign"),
    )
    const location = new URL(response.headers.get("location") ?? "")

    expect(location.pathname).toBe("/member/products")
    expect(location.searchParams.get("billing")).toBe("processing")
    expect(location.searchParams.has("billingProductId")).toBe(false)
    expect(location.searchParams.has("billingPlanId")).toBe(false)
  })
})
