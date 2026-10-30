import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  retrieveLineItems: vi.fn(),
  retrieveProduct: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({
  default: {
    analyticsConversion: { create: mocks.create, update: mocks.update },
  },
}))
vi.mock("@/lib/dodo", () => ({
  dodoClient: {
    payments: { retrieveLineItems: mocks.retrieveLineItems },
    products: { retrieve: mocks.retrieveProduct },
  },
}))
import { sendAttributedGaEvent } from "@/lib/server/analytics/attributedEvents"
import { trackSignupInGa } from "@/lib/server/analytics/loginTracking"
import { trackPlanPurchaseInGa } from "@/lib/server/analytics/planPurchaseTracking"
import {
  acquisitionCheckoutMetadata,
  type AcquisitionContext,
} from "@/lib/analytics/acquisition"

const context: AcquisitionContext = {
  version: 1,
  firstTouch: { path: "/", source: "google", observedAt: 1 },
  conversionVisit: { path: "/pricing", source: "newsletter", observedAt: 2 },
  clientId: "12345.67890",
  sessionId: "1987654321",
  idsObservedAt: Date.now(),
}
let claims: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.stubEnv("GOOGLE_ANALYTICS_ID", "G-TEST")
  vi.stubEnv("GOOGLE_ANALYTICS_API_SECRET", "test-only")
  vi.stubEnv("GOOGLE_ANALYTICS_DEBUG", "true")
  claims = new Set()
  mocks.create.mockImplementation(async ({ data }) => {
    if (claims.has(data.key))
      throw Object.assign(new Error("duplicate"), { code: "P2002" })
    claims.add(data.key)
    return data
  })
  mocks.update.mockResolvedValue({})
  mocks.retrieveLineItems.mockResolvedValue({ items: [] })
  mocks.retrieveProduct.mockResolvedValue({ name: "Pro plan" })
  fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ validationMessages: [] }), { status: 200 }),
    )
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("attributed server conversion delivery", () => {
  it("deduplicates concurrent signup retries with the browser client/session identity", async () => {
    const results = await Promise.all([
      trackSignupInGa({ userId: "local-user", method: "email", context }),
      trackSignupInGa({ userId: "local-user", method: "email", context }),
    ])
    expect(results).toContain("validated")
    expect(results).toContain("duplicate")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload.client_id).toBe(context.clientId)
    expect(payload.events[0].params.session_id).toBe(Number(context.sessionId))
    expect(payload.events[0].params).toMatchObject({
      first_source: "google",
      conversion_source: "newsletter",
    })
    expect(payload).not.toHaveProperty("user_id")
  })
  it("does not fabricate an ID for uncorrelated provider webhooks or missing attribution", async () => {
    await trackSignupInGa({ method: "email" })
    await trackSignupInGa({
      userId: "local-user",
      context: { version: 1, firstTouch: context.firstTouch },
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("checks debug validation messages instead of accepting HTTP 200 as proof", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          validationMessages: [{ validationCode: "VALUE_INVALID" }],
        }),
        { status: 200 },
      ),
    )
    expect(await trackSignupInGa({ userId: "local-user", context })).toBe(
      "rejected",
    )
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "rejected" } }),
    )
  })
  it("does not automatically resend an ambiguous delivery after a timeout", async () => {
    fetchMock.mockRejectedValue(new Error("network outcome unknown"))
    const input = {
      key: "purchase:payment",
      userId: "local-user",
      name: "purchase",
      context,
      params: { transaction_id: "payment" },
    }
    expect(await sendAttributedGaEvent(input)).toBe("unknown_delivery")
    expect(await sendAttributedGaEvent(input)).toBe("duplicate")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it("carries checkout attribution into a verified payment without sending customer details", async () => {
    const payment = {
      payment_id: "pay-fixture",
      status: "succeeded",
      currency: "USD",
      total_amount: 1000,
      metadata: {
        userId: "local-user",
        ...acquisitionCheckoutMetadata(context),
        email: "private@example.com",
        discount_code: "private@example.com",
        token: "private-secret",
      },
      customer: {
        customer_id: "billing-customer",
        email: "private@example.com",
        name: "Private Person",
      },
      product_cart: [{ product_id: "plan-pro", quantity: 1 }],
    }
    const input = {
      userId: "local-user",
      paymentId: payment.payment_id,
      payment: payment as never,
    }
    await trackPlanPurchaseInGa(input)
    await trackPlanPurchaseInGa(input)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = fetchMock.mock.calls[0][1].body
    expect(body).not.toMatch(
      /private@example|private-secret|Private Person|billing-customer/,
    )
    expect(JSON.parse(body)).toMatchObject({
      client_id: context.clientId,
      events: [
        {
          name: "purchase",
          params: expect.objectContaining({ transaction_id: "pay-fixture" }),
        },
      ],
    })
    await trackPlanPurchaseInGa({
      ...input,
      paymentId: "pending-fixture",
      payment: { ...payment, status: "processing" } as never,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
