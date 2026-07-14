import { beforeEach, describe, expect, it, vi } from "vitest"

const { listPayments, prismaMock } = vi.hoisted(() => ({
  listPayments: vi.fn(),
  prismaMock: {
    plan: { findUnique: vi.fn() },
    productPlanGrant: { findUnique: vi.fn() },
  },
}))

vi.mock("@/lib/dodo", () => ({
  dodoClient: { payments: { list: listPayments } },
}))
vi.mock("@/lib/prisma", () => ({ default: prismaMock }))

import {
  hasVerifiedDodoSubscriptionPlanChangePayment,
  isLatestSubscriptionPaymentSucceeded,
} from "@/lib/server/dodoSubscriptionPayments"

async function* paymentResults(
  payments: Array<{ created_at: string; status: string }>,
) {
  yield* payments
}

describe("isLatestSubscriptionPaymentSucceeded", () => {
  beforeEach(() => vi.clearAllMocks())

  it("scopes verification to the provider's target product", async () => {
    listPayments.mockReturnValue(
      paymentResults([
        { created_at: "2026-07-13T10:00:00.000Z", status: "failed" },
      ]),
    )

    await expect(
      isLatestSubscriptionPaymentSucceeded("sub_1", "product_upgrade"),
    ).resolves.toBe(false)
    expect(listPayments).toHaveBeenCalledWith({
      subscription_id: "sub_1",
      product_id: "product_upgrade",
      page_size: 100,
    })
  })

  it("requires the latest matching attempt to have succeeded", async () => {
    listPayments.mockReturnValue(
      paymentResults([
        { created_at: "2026-07-13T10:00:00.000Z", status: "succeeded" },
        { created_at: "2026-07-13T11:00:00.000Z", status: "failed" },
      ]),
    )

    await expect(
      isLatestSubscriptionPaymentSucceeded("sub_1", "product_upgrade"),
    ).resolves.toBe(false)
  })

  it("does not make payment-history availability block terminal state", async () => {
    await expect(
      hasVerifiedDodoSubscriptionPlanChangePayment({
        subscriptionId: "sub_1",
        productId: "product_upgrade",
        status: "cancelled",
      }),
    ).resolves.toBe(false)
    expect(prismaMock.productPlanGrant.findUnique).not.toHaveBeenCalled()
    expect(listPayments).not.toHaveBeenCalled()
  })

  it("checks the target payment when first sync metadata differs", async () => {
    prismaMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    prismaMock.plan.findUnique.mockResolvedValueOnce({
      externalId: "product_current",
    })
    listPayments.mockReturnValue(
      paymentResults([
        { created_at: "2026-07-13T10:00:00.000Z", status: "succeeded" },
      ]),
    )

    await expect(
      hasVerifiedDodoSubscriptionPlanChangePayment({
        subscriptionId: "sub_1",
        productId: "product_upgrade",
        status: "active",
        metadata: { planId: "plan_current" },
      }),
    ).resolves.toBe(true)
    expect(prismaMock.plan.findUnique).toHaveBeenCalledWith({
      where: { id: "plan_current" },
      select: { externalId: true },
    })
    expect(listPayments).toHaveBeenCalledWith({
      subscription_id: "sub_1",
      product_id: "product_upgrade",
      page_size: 100,
    })
  })
})
