import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  listPayments,
  prismaMock,
  reconcilePaymentState,
  refreshCaches,
  retrievePayment,
} = vi.hoisted(() => ({
  listPayments: vi.fn(),
  retrievePayment: vi.fn(),
  reconcilePaymentState: vi.fn(),
  refreshCaches: vi.fn(),
  prismaMock: {
    plan: { aggregate: vi.fn() },
    productPlanGrant: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/dodo", () => ({
  dodoClient: {
    payments: {
      list: listPayments,
      retrieve: retrievePayment,
    },
  },
}))
vi.mock("@/lib/prisma", () => ({ default: prismaMock }))
vi.mock("@/lib/server/productPlanGrantCache", () => ({
  refreshProductPlanGrantCachesFromWorker: refreshCaches,
}))
vi.mock("@/lib/server/productPlanGrants", () => ({
  reconcileDodoOneTimePaymentState: reconcilePaymentState,
}))

import { reconcileRecentDodoOneTimePayments } from "@/lib/server/dodoOneTimeReconciliation"

const NOW = new Date("2026-07-13T12:00:00.000Z")

async function* paymentResults(payments: Array<Record<string, unknown>>) {
  yield* payments
}

function grantResult(
  outcome: "applied" | "recorded" | "duplicate" | "ignored" | "invalid",
  productId: string,
  options: { grantChanged?: boolean; projectionChanged?: boolean } = {},
) {
  return {
    outcome,
    productId,
    grantChanged: options.grantChanged ?? false,
    projectionChanged: options.projectionChanged ?? false,
  }
}

describe("reconcileRecentDodoOneTimePayments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.plan.aggregate.mockResolvedValue({
      _max: { boostForDays: 30 },
    })
    prismaMock.productPlanGrant.findMany.mockResolvedValue([])
    listPayments.mockReturnValue(paymentResults([]))
    refreshCaches.mockResolvedValue(undefined)
  })

  it("deduplicates recent discovery against active grants and retrieves full payments", async () => {
    prismaMock.productPlanGrant.findMany.mockResolvedValue([
      { externalPaymentId: "pay_active" },
    ])
    listPayments.mockReturnValue(
      paymentResults([
        {
          payment_id: "pay_active",
          metadata: { productId: "product_active", planId: "plan_featured" },
          subscription_id: null,
        },
        {
          payment_id: "pay_recent",
          metadata: { product_id: "product_recent", plan_id: "plan_pro" },
          subscription_id: null,
        },
      ]),
    )
    retrievePayment.mockImplementation(async (paymentId: string) => ({
      payment_id: paymentId,
      status: "succeeded",
      product_cart: [{ product_id: `${paymentId}_provider_product` }],
    }))
    reconcilePaymentState
      .mockResolvedValueOnce(
        grantResult("applied", "product_active", { grantChanged: true }),
      )
      .mockResolvedValueOnce(
        grantResult("applied", "product_recent", { projectionChanged: true }),
      )

    const summary = await reconcileRecentDodoOneTimePayments(NOW)

    expect(listPayments).toHaveBeenCalledWith({
      status: "succeeded",
      created_at_gte: "2026-06-11T12:00:00.000Z",
      page_size: 100,
    })
    expect(retrievePayment).toHaveBeenCalledTimes(2)
    expect(retrievePayment).toHaveBeenNthCalledWith(1, "pay_active")
    expect(retrievePayment).toHaveBeenNthCalledWith(2, "pay_recent")
    expect(reconcilePaymentState).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        payment_id: "pay_active",
        product_cart: expect.any(Array),
      }),
      { now: NOW },
    )
    expect(reconcilePaymentState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        payment_id: "pay_recent",
        product_cart: expect.any(Array),
      }),
      { now: NOW },
    )
    expect(refreshCaches).toHaveBeenCalledWith(
      ["product_active", "product_recent"],
      "one-time-payments.reconciled",
    )
    expect(summary).toMatchObject({
      lookbackDays: 32,
      paymentCount: 2,
      touchedProducts: 2,
      changedProducts: 2,
      failures: 0,
      outcomes: { applied: 2 },
    })
  })

  it("refreshes caches for a valid duplicate with no ledger changes", async () => {
    prismaMock.productPlanGrant.findMany.mockResolvedValue([
      { externalPaymentId: "pay_duplicate" },
    ])
    retrievePayment.mockResolvedValue({
      payment_id: "pay_duplicate",
      status: "succeeded",
    })
    reconcilePaymentState.mockResolvedValue(
      grantResult("duplicate", "product_1"),
    )

    const summary = await reconcileRecentDodoOneTimePayments(NOW)

    expect(refreshCaches).toHaveBeenCalledWith(
      ["product_1"],
      "one-time-payments.reconciled",
    )
    expect(summary).toMatchObject({
      paymentCount: 1,
      touchedProducts: 1,
      changedProducts: 0,
      failures: 0,
      outcomes: { duplicate: 1 },
    })
  })

  it("rejects the reconciliation run when the central service returns invalid", async () => {
    prismaMock.productPlanGrant.findMany.mockResolvedValue([
      { externalPaymentId: "pay_invalid" },
    ])
    retrievePayment.mockResolvedValue({
      payment_id: "pay_invalid",
      status: "succeeded",
    })
    reconcilePaymentState.mockResolvedValue({
      ...grantResult("invalid", "product_1"),
      reason: "payment_cart_plan_mismatch",
    })

    await expect(reconcileRecentDodoOneTimePayments(NOW)).rejects.toThrow(
      "1 one-time payment reconciliation operation(s) failed",
    )
    expect(refreshCaches).not.toHaveBeenCalled()
  })
})
