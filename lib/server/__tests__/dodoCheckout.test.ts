import { beforeEach, describe, expect, it, vi } from "vitest"

const checkoutCreateMock = vi.fn()
const paymentsCreateMock = vi.fn()

vi.mock("@/lib/dodo", () => ({
  dodoClient: {
    checkoutSessions: {
      create: checkoutCreateMock,
    },
    payments: {
      create: paymentsCreateMock,
    },
  },
}))

let createPlanCheckout: typeof import("@/lib/server/dodoCheckout")["createPlanCheckout"]

describe("createPlanCheckout", () => {
  beforeEach(async () => {
    vi.resetModules()
    checkoutCreateMock.mockReset()
    paymentsCreateMock.mockReset()

    const mod = await import("@/lib/server/dodoCheckout")
    createPlanCheckout = mod.createPlanCheckout
  })

  it("throws when plan external id missing", async () => {
    await expect(
      createPlanCheckout({
        plan: { externalId: "" },
        customer: { email: "user@example.com" },
      }),
    ).rejects.toThrowError(/external id/)
  })

  it("returns checkout url for recurring plans", async () => {
    checkoutCreateMock.mockResolvedValue({
      checkout_url: " https://checkout/session ",
    })

    const result = await createPlanCheckout({
      plan: { externalId: "prod_123", type: "recurring_price" as any },
      customer: { email: "user@example.com", name: "Ada" },
      metadata: { planId: "plan_1" },
      returnUrl: "https://example.com/return",
    })

    expect(result).toEqual({
      url: "https://checkout/session",
      kind: "subscription",
    })
    expect(checkoutCreateMock).toHaveBeenCalledWith({
      product_cart: [{ product_id: "prod_123", quantity: 1 }],
      customer: { email: "user@example.com", name: "Ada" },
      metadata: { planId: "plan_1" },
      return_url: "https://example.com/return",
    })
  })

  it("returns payment link for one-time plans", async () => {
    paymentsCreateMock.mockResolvedValue({
      payment_link: "https://pay/link",
    })

    const result = await createPlanCheckout({
      plan: { externalId: "prod_456", type: "one_time_price" as any },
      customer: { email: "user@example.com" },
      metadata: { planId: "plan_2" },
    })

    expect(result).toEqual({
      url: "https://pay/link",
      kind: "payment_link",
    })
    expect(paymentsCreateMock).toHaveBeenCalledWith({
      billing: {
        street: "",
        city: "",
        state: "",
        zipcode: "",
        country: "US",
      },
      customer: { email: "user@example.com" },
      product_cart: [{ product_id: "prod_456", quantity: 1 }],
      metadata: { planId: "plan_2" },
      payment_link: true,
      return_url: undefined,
    })
  })

  it("throws when Dodo session missing url", async () => {
    checkoutCreateMock.mockResolvedValue({})

    await expect(
      createPlanCheckout({
        plan: { externalId: "prod_123", type: "recurring_price" as any },
        customer: { email: "user@example.com" },
      }),
    ).rejects.toThrowError(/Missing checkout URL/)
  })

  it("throws when payment link missing", async () => {
    paymentsCreateMock.mockResolvedValue({})

    await expect(
      createPlanCheckout({
        plan: { externalId: "prod_456", type: "one_time_price" as any },
        customer: { email: "user@example.com" },
      }),
    ).rejects.toThrowError(/Missing payment link/)
  })
})
