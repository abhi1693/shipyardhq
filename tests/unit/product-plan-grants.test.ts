import { beforeEach, describe, expect, it, vi } from "vitest"

const { enqueueBoundaryJob, prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    plan: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    productPlanGrant: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    eventEnvelope: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    userPlanPurchase: {
      upsert: vi.fn(),
    },
  }
  return {
    enqueueBoundaryJob: vi.fn().mockResolvedValue(undefined),
    txMock: tx,
    prismaMock: {
      $transaction: vi.fn(),
      productPlanGrant: {
        findUnique: vi.fn(),
      },
    },
  }
})

vi.mock("@/lib/prisma", () => ({ default: prismaMock }))
vi.mock("@/lib/server/jobs/eventQueue", () => ({
  enqueueEventEnvelopeJob: enqueueBoundaryJob,
}))

import {
  fulfillDodoOneTimePayment,
  isGrantWindowActive,
  reconcileDodoOneTimePaymentState,
  recomputeProductPlanGrantProjectionAtBoundary,
  refundDodoOneTimePayment,
  resolveOneTimeGrantWindow,
  syncDodoSubscriptionGrant,
} from "@/lib/server/productPlanGrants"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import { Prisma } from "@/lib/vendor/prisma/client"

const NOW = new Date("2026-07-13T12:00:00.000Z")
const PAYMENT_CREATED_AT = "2026-07-13T10:00:00.000Z"
const PRODUCT_ID = "product_1"
const PLAN_ID = "plan_spotlight"
const PAYMENT_ID = "pay_1"

const ownerProduct = {
  id: PRODUCT_ID,
  userId: "user_1",
  user: { email: "owner@example.com" },
}

const paidPlan = {
  id: PLAN_ID,
  externalId: "dodo_spotlight",
  type: "one_time_price",
  price: 499,
  boostForDays: 7,
  isDefault: false,
}

const payment = {
  payment_id: PAYMENT_ID,
  status: "succeeded",
  created_at: PAYMENT_CREATED_AT,
  total_amount: 499,
  currency: "USD",
  customer: {
    customer_id: "customer_1",
    email: "owner@example.com",
  },
  metadata: {
    productId: PRODUCT_ID,
    planId: PLAN_ID,
    userId: "user_1",
  },
  product_cart: [{ product_id: "dodo_spotlight", quantity: 1 }],
}

describe("product plan grant windows", () => {
  it("snapshots the one-time entitlement from the payment timestamp", () => {
    const window = resolveOneTimeGrantWindow(PAYMENT_CREATED_AT, 7)
    expect(window).toEqual({
      startsAt: new Date(PAYMENT_CREATED_AT),
      expiresAt: new Date("2026-07-20T10:00:00.000Z"),
    })
  })

  it("rejects invalid timestamps and non-positive durations", () => {
    expect(resolveOneTimeGrantWindow("invalid", 7)).toBeNull()
    expect(resolveOneTimeGrantWindow(PAYMENT_CREATED_AT, 0)).toBeNull()
  })

  it("uses an inclusive start and exclusive expiry", () => {
    const startsAt = new Date("2026-07-13T10:00:00.000Z")
    const expiresAt = new Date("2026-07-20T10:00:00.000Z")

    expect(isGrantWindowActive(startsAt, expiresAt, startsAt)).toBe(true)
    expect(isGrantWindowActive(startsAt, expiresAt, expiresAt)).toBe(false)
    expect(
      isGrantWindowActive(
        startsAt,
        expiresAt,
        new Date(startsAt.getTime() - 1),
      ),
    ).toBe(false)
  })

  it("never encodes remaining time as a future assignment timestamp", () => {
    expect(
      resolvePlanAssignedAt({
        currentPlan: { boostForDays: 7, isDefault: false },
        currentAssignedAt: new Date("2026-07-12T12:00:00.000Z"),
        newPlan: { boostForDays: 7, isDefault: false },
        now: NOW,
      }),
    ).toEqual(NOW)
  })
})

describe("product plan grant boundary projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation(txMock),
    )
  })

  it("publishes a draft when its future Dodo grant reaches the inclusive start", async () => {
    const expiresAt = new Date("2026-07-20T12:00:00.000Z")
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 0 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: "plan_free",
      planAssignedAt: null,
      subscriptionId: null,
      status: "draft",
      publishedAt: null,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_starting",
        planId: PLAN_ID,
        startsAt: NOW,
        expiresAt,
        createdAt: NOW,
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
    ])
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    const projection = await recomputeProductPlanGrantProjectionAtBoundary(
      PRODUCT_ID,
      NOW,
    )

    expect(projection).toEqual({
      productId: PRODUCT_ID,
      grantsExpired: 0,
      projectionChanged: true,
    })
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: {
        planId: PLAN_ID,
        planAssignedAt: NOW,
        subscriptionId: null,
        status: "published",
        publishedAt: NOW,
      },
    })
  })

  it("expires a higher grant and atomically falls back to a lower active grant", async () => {
    const lowerStartsAt = new Date("2026-07-10T12:00:00.000Z")
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 1 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: "plan_pro",
      planAssignedAt: new Date("2026-07-12T12:00:00.000Z"),
      subscriptionId: null,
      status: "published",
      publishedAt: lowerStartsAt,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_featured",
        planId: "plan_featured",
        startsAt: lowerStartsAt,
        expiresAt: new Date("2026-07-18T12:00:00.000Z"),
        createdAt: lowerStartsAt,
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
    ])
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    const projection = await recomputeProductPlanGrantProjectionAtBoundary(
      PRODUCT_ID,
      NOW,
    )

    expect(txMock.productPlanGrant.updateMany).toHaveBeenCalledWith({
      where: {
        productId: PRODUCT_ID,
        status: "active",
        expiresAt: { lte: NOW },
      },
      data: { status: "expired" },
    })
    expect(projection.grantsExpired).toBe(1)
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: {
        planId: "plan_featured",
        planAssignedAt: lowerStartsAt,
        subscriptionId: null,
      },
    })
    expect(txMock.plan.findFirst).not.toHaveBeenCalled()
  })

  it("falls back to the default plan when the last paid grant expires", async () => {
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 1 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: PLAN_ID,
      planAssignedAt: new Date(PAYMENT_CREATED_AT),
      subscriptionId: null,
      status: "published",
      publishedAt: new Date(PAYMENT_CREATED_AT),
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    await recomputeProductPlanGrantProjectionAtBoundary(PRODUCT_ID, NOW)

    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: {
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
      },
    })
  })

  it("does not publish a draft when the worker misses the entire grant window", async () => {
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 1 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: "plan_free",
      planAssignedAt: null,
      subscriptionId: null,
      status: "draft",
      publishedAt: null,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })

    const projection = await recomputeProductPlanGrantProjectionAtBoundary(
      PRODUCT_ID,
      NOW,
    )

    expect(projection.grantsExpired).toBe(1)
    expect(projection.projectionChanged).toBe(false)
    expect(txMock.product.update).not.toHaveBeenCalled()
  })

  it("deduplicates a simultaneous grant expiry and start into one product wake-up", async () => {
    const sharedBoundary = new Date("2026-07-15T12:00:00.000Z")
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 0 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: PLAN_ID,
      planAssignedAt: NOW,
      subscriptionId: null,
      status: "published",
      publishedAt: NOW,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_current",
        planId: PLAN_ID,
        startsAt: NOW,
        expiresAt: sharedBoundary,
        createdAt: NOW,
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
      {
        id: "grant_next",
        planId: "plan_pro",
        startsAt: sharedBoundary,
        expiresAt: new Date("2026-07-30T12:00:00.000Z"),
        createdAt: NOW,
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 999 },
      },
    ])

    await recomputeProductPlanGrantProjectionAtBoundary(PRODUCT_ID, NOW)

    const scheduled = txMock.eventEnvelope.createMany.mock.calls.at(-1)?.[0]
      .data as Array<{ id: string }>
    expect(
      scheduled.filter((event) =>
        event.id.endsWith(`-${sharedBoundary.getTime()}`),
      ),
    ).toHaveLength(1)
  })

  it("does not downgrade a subscription for a stale expiry after its window extends", async () => {
    const startsAt = new Date("2026-07-01T00:00:00.000Z")
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 0 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: "plan_recurring",
      planAssignedAt: startsAt,
      subscriptionId: "sub_1",
      status: "published",
      publishedAt: startsAt,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_subscription",
        planId: "plan_recurring",
        startsAt,
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
        createdAt: startsAt,
        source: "dodo_subscription",
        externalSubscriptionId: "sub_1",
        plan: { price: 999 },
      },
    ])

    const projection = await recomputeProductPlanGrantProjectionAtBoundary(
      PRODUCT_ID,
      NOW,
    )

    expect(projection).toEqual({
      productId: PRODUCT_ID,
      grantsExpired: 0,
      projectionChanged: false,
    })
    expect(txMock.product.update).not.toHaveBeenCalled()
  })

  it("keeps the durable boundary envelope when delayed queueing fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const startsAt = new Date("2026-07-01T00:00:00.000Z")
    const expiresAt = new Date("2026-08-01T00:00:00.000Z")
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 0 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: PLAN_ID,
      planAssignedAt: startsAt,
      subscriptionId: null,
      status: "published",
      publishedAt: startsAt,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_queued",
        planId: PLAN_ID,
        startsAt,
        expiresAt,
        createdAt: startsAt,
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
    ])
    enqueueBoundaryJob.mockRejectedValueOnce(new Error("Redis unavailable"))

    await expect(
      recomputeProductPlanGrantProjectionAtBoundary(PRODUCT_ID, NOW),
    ).resolves.toEqual({
      productId: PRODUCT_ID,
      grantsExpired: 0,
      projectionChanged: false,
    })
    expect(txMock.eventEnvelope.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          event: "product.plan-grant-boundary",
          nextRunAt: new Date("2026-08-01T00:00:01.000Z"),
        }),
      ],
      skipDuplicates: true,
    })
    expect(warn).toHaveBeenCalledWith(
      "[plan-grant.boundary] delayed enqueue failed",
      expect.objectContaining({ productId: PRODUCT_ID }),
    )
    warn.mockRestore()
  })

  it("does not enqueue a boundary job when the database transaction rolls back", async () => {
    const startsAt = new Date("2026-07-01T00:00:00.000Z")
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 0 })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: PLAN_ID,
      planAssignedAt: startsAt,
      subscriptionId: null,
      status: "published",
      publishedAt: startsAt,
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_rolled_back",
        planId: PLAN_ID,
        startsAt,
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
        createdAt: startsAt,
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
    ])
    prismaMock.$transaction.mockImplementationOnce(async (operation: any) => {
      await operation(txMock)
      throw new Error("commit failed")
    })

    await expect(
      recomputeProductPlanGrantProjectionAtBoundary(PRODUCT_ID, NOW),
    ).rejects.toThrow("commit failed")

    expect(txMock.eventEnvelope.createMany).toHaveBeenCalledTimes(1)
    expect(enqueueBoundaryJob).not.toHaveBeenCalled()
  })

  it("discards boundary jobs from a serialization retry and enqueues only the committed attempt", async () => {
    const startsAt = new Date("2026-07-01T00:00:00.000Z")
    const rolledBackExpiry = new Date("2026-08-01T00:00:00.000Z")
    const committedExpiry = new Date("2026-09-01T00:00:00.000Z")
    const productProjection = {
      id: PRODUCT_ID,
      planId: PLAN_ID,
      planAssignedAt: startsAt,
      subscriptionId: null,
      status: "published",
      publishedAt: startsAt,
    }
    const grantProjection = (id: string, expiresAt: Date) => ({
      id,
      planId: PLAN_ID,
      startsAt,
      expiresAt,
      createdAt: startsAt,
      source: "dodo_payment",
      externalSubscriptionId: null,
      plan: { price: 499 },
    })

    txMock.productPlanGrant.updateMany.mockResolvedValue({ count: 0 })
    txMock.product.findUnique.mockResolvedValue(productProjection)
    txMock.productPlanGrant.findMany
      .mockResolvedValueOnce([
        grantProjection("grant_rolled_back", rolledBackExpiry),
      ])
      .mockResolvedValueOnce([
        grantProjection("grant_committed", committedExpiry),
      ])

    let attempt = 0
    prismaMock.$transaction.mockImplementation(async (operation: any) => {
      const transactionResult = await operation(txMock)
      attempt += 1
      if (attempt === 1) {
        throw new Prisma.PrismaClientKnownRequestError("retry transaction", {
          code: "P2034",
          clientVersion: "test",
        })
      }
      return transactionResult
    })

    await expect(
      recomputeProductPlanGrantProjectionAtBoundary(PRODUCT_ID, NOW),
    ).resolves.toMatchObject({ projectionChanged: false })

    expect(attempt).toBe(2)
    expect(enqueueBoundaryJob).toHaveBeenCalledTimes(1)
    expect(enqueueBoundaryJob).toHaveBeenCalledWith(
      {
        envelopeId: `product-plan-grant-boundary-${PRODUCT_ID}-${committedExpiry.getTime()}`,
        queue: "high",
      },
      expect.objectContaining({ replaceExisting: true }),
    )
    expect(enqueueBoundaryJob).not.toHaveBeenCalledWith(
      expect.objectContaining({
        envelopeId: `product-plan-grant-boundary-${PRODUCT_ID}-${rolledBackExpiry.getTime()}`,
      }),
      expect.anything(),
    )
  })
})

describe("Dodo one-time grant fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation(txMock),
    )
    txMock.productPlanGrant.findMany.mockResolvedValue([])
    txMock.productPlanGrant.updateMany.mockResolvedValue({ count: 0 })
  })

  it("commits the grant and outbox before Redis delivery despite owner email drift", async () => {
    const createdGrant = {
      id: "grant_1",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      status: "active",
    }

    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "draft",
        publishedAt: null,
      })
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.productPlanGrant.create.mockResolvedValueOnce(createdGrant)
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_1",
        planId: PLAN_ID,
        startsAt: new Date(PAYMENT_CREATED_AT),
        expiresAt: new Date("2026-07-20T10:00:00.000Z"),
        createdAt: new Date(PAYMENT_CREATED_AT),
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
    ])
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })
    txMock.eventEnvelope.createMany.mockResolvedValueOnce({ count: 0 })

    let transactionCommitted = false
    let enqueueObservedCommit = false
    let markTransactionCallbackFinished!: () => void
    let releaseCommit!: () => void
    const transactionCallbackFinished = new Promise<void>((resolve) => {
      markTransactionCallbackFinished = resolve
    })
    const commitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve
    })
    prismaMock.$transaction.mockImplementationOnce(async (operation: any) => {
      const transactionResult = await operation(txMock)
      markTransactionCallbackFinished()
      await commitGate
      transactionCommitted = true
      return transactionResult
    })
    enqueueBoundaryJob.mockImplementationOnce(() => {
      enqueueObservedCommit = transactionCommitted
      return new Promise<void>(() => undefined)
    })

    const fulfillmentPromise = fulfillDodoOneTimePayment(
      {
        ...payment,
        customer: { ...payment.customer, email: "old-owner@example.com" },
        metadata: { productId: PRODUCT_ID, planId: PLAN_ID },
      },
      { now: NOW },
    )
    await transactionCallbackFinished
    expect(txMock.eventEnvelope.createMany).toHaveBeenCalledTimes(1)
    expect(enqueueBoundaryJob).not.toHaveBeenCalled()

    releaseCommit()
    const fulfillment = await Promise.race([
      fulfillmentPromise,
      new Promise<"redis-blocked">((resolve) => {
        setImmediate(() => resolve("redis-blocked"))
      }),
    ])

    expect(fulfillment).not.toBe("redis-blocked")
    if (fulfillment === "redis-blocked") return

    expect(fulfillment).toMatchObject({
      outcome: "applied",
      productId: PRODUCT_ID,
      grantId: "grant_1",
      projectionChanged: true,
    })
    expect(txMock.productPlanGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        externalPaymentId: PAYMENT_ID,
        startsAt: new Date(PAYMENT_CREATED_AT),
        expiresAt: new Date("2026-07-20T10:00:00.000Z"),
        status: "active",
      }),
    })
    expect(txMock.userPlanPurchase.upsert).toHaveBeenCalledWith({
      where: {
        userId_planId: { userId: "user_1", planId: PLAN_ID },
      },
      update: {},
      create: { userId: "user_1", planId: PLAN_ID },
    })
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: {
        planId: PLAN_ID,
        planAssignedAt: new Date(PAYMENT_CREATED_AT),
        subscriptionId: null,
        status: "published",
        publishedAt: NOW,
      },
    })
    expect(txMock.eventEnvelope.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: `product-plan-grant-boundary-${PRODUCT_ID}-${new Date("2026-07-20T10:00:00.000Z").getTime()}`,
          event: "product.plan-grant-boundary",
          nextRunAt: new Date("2026-07-20T10:00:01.000Z"),
        }),
      ],
      skipDuplicates: true,
    })
    expect(enqueueBoundaryJob).toHaveBeenCalledWith(
      expect.objectContaining({
        envelopeId: expect.stringContaining(PRODUCT_ID),
      }),
      expect.objectContaining({ replaceExisting: true }),
    )
    expect(enqueueObservedCommit).toBe(true)
  })

  it("ignores historical payments whose product was deleted", async () => {
    txMock.product.findUnique.mockResolvedValueOnce(null)
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)

    const fulfillment = await fulfillDodoOneTimePayment(payment, { now: NOW })

    expect(fulfillment).toMatchObject({
      outcome: "ignored",
      reason: "product_deleted_or_missing",
      productId: PRODUCT_ID,
    })
    expect(txMock.productPlanGrant.create).not.toHaveBeenCalled()
  })

  it("ignores a first-seen full refund for a deleted product", async () => {
    prismaMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.product.findUnique.mockResolvedValueOnce(null)
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)

    const reconciliation = await reconcileDodoOneTimePaymentState(
      {
        ...payment,
        refund_status: "full",
        refunds: [
          {
            refund_id: "refund_deleted",
            payment_id: PAYMENT_ID,
            status: "succeeded",
            is_partial: false,
            created_at: NOW.toISOString(),
          },
        ],
      },
      { now: NOW },
    )

    expect(reconciliation).toMatchObject({
      outcome: "ignored",
      reason: "product_deleted_or_missing",
      productId: PRODUCT_ID,
    })
    expect(txMock.productPlanGrant.create).not.toHaveBeenCalled()
  })

  it("ignores a first-seen terminal dispute for a deleted product", async () => {
    prismaMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.product.findUnique.mockResolvedValueOnce(null)
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)

    const reconciliation = await reconcileDodoOneTimePaymentState(
      {
        ...payment,
        disputes: [
          {
            dispute_id: "dispute_deleted",
            payment_id: PAYMENT_ID,
            dispute_status: "dispute_lost",
            created_at: NOW.toISOString(),
          },
        ],
      },
      { now: NOW },
    )

    expect(reconciliation).toMatchObject({
      outcome: "ignored",
      reason: "product_deleted_or_missing",
      productId: PRODUCT_ID,
    })
    expect(txMock.productPlanGrant.create).not.toHaveBeenCalled()
  })

  it("records an old payment as expired without reactivating the product", async () => {
    const expiredPayment = {
      ...payment,
      payment_id: "pay_old",
      created_at: "2026-01-01T00:00:00.000Z",
    }
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "draft",
        publishedAt: null,
      })
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.productPlanGrant.create.mockResolvedValueOnce({
      id: "grant_old",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      status: "expired",
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })

    const fulfillment = await fulfillDodoOneTimePayment(expiredPayment, {
      now: NOW,
    })

    expect(fulfillment).toMatchObject({
      outcome: "recorded",
      reason: "payment_expired",
      projectionChanged: false,
    })
    expect(txMock.productPlanGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "expired" }),
    })
    expect(txMock.product.update).not.toHaveBeenCalled()
  })

  it("keeps a future provider timestamp eligible instead of terminally expiring it", async () => {
    const futurePayment = {
      ...payment,
      payment_id: "pay_future",
      created_at: "2026-07-13T12:00:01.000Z",
    }
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "draft",
        publishedAt: null,
      })
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.productPlanGrant.create.mockResolvedValueOnce({
      id: "grant_future",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      status: "active",
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_future",
        planId: PLAN_ID,
        startsAt: new Date("2026-07-13T12:00:01.000Z"),
        expiresAt: new Date("2026-07-20T12:00:01.000Z"),
        createdAt: new Date("2026-07-13T12:00:01.000Z"),
        source: "dodo_payment",
        externalSubscriptionId: null,
        plan: { price: 499 },
      },
    ])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })

    const fulfillment = await fulfillDodoOneTimePayment(futurePayment, {
      now: NOW,
    })

    expect(fulfillment).toMatchObject({
      outcome: "recorded",
      reason: "payment_pending_start",
    })
    expect(txMock.productPlanGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "active" }),
    })
    expect(txMock.eventEnvelope.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: `product-plan-grant-boundary-${PRODUCT_ID}-${new Date("2026-07-13T12:00:01.000Z").getTime()}`,
          nextRunAt: new Date("2026-07-13T12:00:02.000Z"),
        }),
        expect.objectContaining({
          id: `product-plan-grant-boundary-${PRODUCT_ID}-${new Date("2026-07-20T12:00:01.000Z").getTime()}`,
          nextRunAt: new Date("2026-07-20T12:00:02.000Z"),
        }),
      ]),
      skipDuplicates: true,
    })
  })

  it("never reactivates a terminal grant on duplicate delivery", async () => {
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "draft",
        publishedAt: null,
      })
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce({
      id: "grant_refunded",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      status: "refunded",
      startsAt: new Date(PAYMENT_CREATED_AT),
      expiresAt: new Date("2026-07-20T10:00:00.000Z"),
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })

    const fulfillment = await fulfillDodoOneTimePayment(payment, { now: NOW })

    expect(fulfillment).toMatchObject({
      outcome: "duplicate",
      reason: "grant_refunded",
      projectionChanged: false,
    })
    expect(txMock.productPlanGrant.create).not.toHaveBeenCalled()
    expect(txMock.productPlanGrant.update).not.toHaveBeenCalled()
    expect(txMock.product.update).not.toHaveBeenCalled()
  })

  it("revokes the matching migration shadow for a terminal payment grant", async () => {
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: PLAN_ID,
        planAssignedAt: new Date(PAYMENT_CREATED_AT),
        subscriptionId: null,
      })
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce({
      id: "grant_refunded",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      status: "refunded",
      startsAt: new Date(PAYMENT_CREATED_AT),
      expiresAt: new Date("2026-07-20T10:00:00.000Z"),
    })
    txMock.productPlanGrant.updateMany.mockResolvedValueOnce({ count: 1 })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    const fulfillment = await fulfillDodoOneTimePayment(payment, { now: NOW })

    expect(fulfillment).toMatchObject({
      outcome: "duplicate",
      reason: "grant_refunded",
      grantChanged: true,
      projectionChanged: true,
    })
    expect(txMock.productPlanGrant.updateMany).toHaveBeenCalledWith({
      where: {
        productId: PRODUCT_ID,
        planId: PLAN_ID,
        source: "migration",
        status: "active",
      },
      data: { status: "revoked" },
    })
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: {
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
      },
    })
  })
})

describe("Dodo one-time grant refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation(txMock),
    )
    txMock.productPlanGrant.updateMany.mockResolvedValue({ count: 0 })
  })

  it("revokes access when partial events complete an aggregate full refund", async () => {
    const knownGrant = {
      id: "grant_1",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      externalRefundId: null,
      status: "active",
    }
    prismaMock.productPlanGrant.findUnique.mockResolvedValueOnce(knownGrant)
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(knownGrant)
    txMock.productPlanGrant.update.mockResolvedValueOnce({
      ...knownGrant,
      status: "refunded",
    })
    txMock.product.findUnique.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: PLAN_ID,
      planAssignedAt: new Date(PAYMENT_CREATED_AT),
      subscriptionId: null,
      status: "published",
      publishedAt: new Date(PAYMENT_CREATED_AT),
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([])
    txMock.plan.findFirst.mockResolvedValueOnce({ id: "plan_free" })
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    const refund = await refundDodoOneTimePayment(
      { ...payment, refund_status: "full" },
      {
        refund_id: "refund_2",
        payment_id: PAYMENT_ID,
        status: "succeeded",
        is_partial: true,
        created_at: NOW.toISOString(),
      },
      { now: NOW },
    )

    expect(refund).toMatchObject({
      outcome: "recorded",
      reason: "payment_refunded",
      grantChanged: true,
      projectionChanged: true,
    })
    expect(txMock.productPlanGrant.update).toHaveBeenCalledWith({
      where: { id: "grant_1" },
      data: {
        status: "refunded",
        refundedAt: NOW,
        externalRefundId: "refund_2",
      },
    })
  })
})

describe("Dodo one-time grant disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation(txMock),
    )
    txMock.productPlanGrant.findMany.mockResolvedValue([])
    txMock.productPlanGrant.updateMany.mockResolvedValue({ count: 0 })
    txMock.plan.findFirst.mockResolvedValue({ id: "plan_free" })
  })

  it("records a first-seen terminal dispute as revoked, not refunded", async () => {
    const terminalGrant = {
      id: "grant_disputed",
      productId: PRODUCT_ID,
      planId: PLAN_ID,
      status: "refunded",
      externalRefundId: null,
      metadata: { durationDays: 7 },
    }
    prismaMock.productPlanGrant.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(terminalGrant)
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "published",
        publishedAt: NOW,
      })
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "published",
        publishedAt: NOW,
      })
    txMock.plan.findUnique.mockResolvedValueOnce(paidPlan)
    txMock.productPlanGrant.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(terminalGrant)
    txMock.productPlanGrant.create.mockResolvedValueOnce(terminalGrant)
    txMock.productPlanGrant.update.mockResolvedValueOnce({
      ...terminalGrant,
      status: "revoked",
    })

    const dispute = await reconcileDodoOneTimePaymentState(
      {
        ...payment,
        disputes: [
          {
            dispute_id: "dispute_1",
            payment_id: PAYMENT_ID,
            dispute_status: "dispute_accepted",
            created_at: NOW.toISOString(),
          },
        ],
      },
      { now: NOW },
    )

    expect(dispute).toMatchObject({
      outcome: "recorded",
      reason: "dispute_accepted",
      grantChanged: true,
    })
    expect(txMock.productPlanGrant.update).toHaveBeenCalledWith({
      where: { id: "grant_disputed" },
      data: {
        status: "revoked",
        refundedAt: null,
        metadata: {
          durationDays: 7,
          disputeId: "dispute_1",
          disputeStatus: "dispute_accepted",
          disputeOccurredAt: NOW.toISOString(),
        },
      },
    })
  })
})

describe("Dodo subscription grant synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (operation: any) =>
      operation(txMock),
    )
  })

  it("ignores a subscription snapshot older than the stored observation", async () => {
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce({
      id: "grant_subscription",
      productId: PRODUCT_ID,
      planId: "plan_recurring",
      metadata: {
        providerObservedAt: "2026-07-13T13:00:00.000Z",
      },
    })

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_1",
        status: "active",
        product_id: "dodo_recurring",
        metadata: {},
      },
      { now: NOW, providerObservedAt: NOW },
    )

    expect(synchronization).toMatchObject({
      outcome: "duplicate",
      reason: "stale_subscription_snapshot",
      productId: PRODUCT_ID,
      grantChanged: false,
      projectionChanged: false,
    })
    expect(txMock.productPlanGrant.upsert).not.toHaveBeenCalled()
    expect(txMock.product.update).not.toHaveBeenCalled()
  })

  it("does not let an equal-timestamp active snapshot override terminal state", async () => {
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce({
      id: "grant_subscription",
      productId: PRODUCT_ID,
      planId: "plan_recurring",
      status: "revoked",
      metadata: {
        providerObservedAt: NOW.toISOString(),
      },
    })

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_1",
        status: "active",
        product_id: "dodo_recurring",
        metadata: {},
      },
      { now: NOW, providerObservedAt: NOW },
    )

    expect(synchronization).toMatchObject({
      outcome: "duplicate",
      reason: "stale_subscription_snapshot",
    })
    expect(txMock.productPlanGrant.upsert).not.toHaveBeenCalled()
  })

  it("rejects an active subscription with an unknown provider product", async () => {
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.plan.findUnique.mockResolvedValueOnce(null)

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_unknown",
        status: "active",
        product_id: "dodo_unknown",
        metadata: {
          productId: PRODUCT_ID,
          planId: "plan_recurring",
          userId: "user_1",
        },
      },
      { now: NOW },
    )

    expect(synchronization).toMatchObject({
      outcome: "invalid",
      reason: "provider_subscription_plan_not_found",
      productId: PRODUCT_ID,
      grantChanged: false,
      projectionChanged: false,
    })
    expect(txMock.productPlanGrant.upsert).not.toHaveBeenCalled()
  })

  it("ignores historical subscriptions whose product was deleted", async () => {
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.plan.findUnique
      .mockResolvedValueOnce({
        id: "plan_recurring",
        type: "recurring_price",
        isDefault: false,
      })
      .mockResolvedValueOnce({
        id: "plan_recurring",
        type: "recurring_price",
        isDefault: false,
      })
    txMock.product.findUnique.mockResolvedValueOnce(null)

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_deleted",
        status: "active",
        product_id: "dodo_recurring",
        metadata: {
          productId: PRODUCT_ID,
          planId: "plan_recurring",
          userId: "user_1",
        },
      },
      { now: NOW },
    )

    expect(synchronization).toMatchObject({
      outcome: "ignored",
      reason: "product_deleted_or_missing",
      productId: PRODUCT_ID,
    })
    expect(txMock.productPlanGrant.upsert).not.toHaveBeenCalled()
  })

  it("upserts the provider window and projects the subscription id", async () => {
    txMock.plan.findUnique.mockResolvedValueOnce({
      id: "plan_recurring",
      type: "recurring_price",
      isDefault: false,
    })
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "draft",
        publishedAt: null,
      })
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.productPlanGrant.upsert.mockResolvedValueOnce({
      id: "grant_subscription",
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_subscription",
        planId: "plan_recurring",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        source: "dodo_subscription",
        externalSubscriptionId: "sub_1",
        plan: { price: 999 },
      },
    ])
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_1",
        status: "active",
        created_at: "2026-07-01T00:00:00.000Z",
        previous_billing_date: "2026-07-01T00:00:00.000Z",
        next_billing_date: "2026-08-01T00:00:00.000Z",
        product_id: "dodo_recurring",
        customer: {
          customer_id: "customer_1",
          email: "owner@example.com",
        },
        metadata: {
          productId: PRODUCT_ID,
          planId: "plan_recurring",
          userId: "user_1",
        },
      },
      { now: NOW },
    )

    expect(synchronization).toMatchObject({
      outcome: "applied",
      grantChanged: true,
      projectionChanged: true,
    })
    expect(txMock.productPlanGrant.upsert).toHaveBeenCalledWith({
      where: { externalSubscriptionId: "sub_1" },
      create: expect.objectContaining({
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
        status: "active",
      }),
      update: expect.objectContaining({ status: "active" }),
    })
    expect(txMock.userPlanPurchase.upsert).toHaveBeenCalledWith({
      where: {
        userId_planId: {
          userId: "user_1",
          planId: "plan_recurring",
        },
      },
      update: {},
      create: { userId: "user_1", planId: "plan_recurring" },
    })
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: {
        planId: "plan_recurring",
        planAssignedAt: new Date("2026-07-01T00:00:00.000Z"),
        subscriptionId: "sub_1",
        status: "published",
        publishedAt: NOW,
      },
    })
  })

  it("keeps the verified plan when a provider plan change is unpaid", async () => {
    const existingGrant = {
      id: "grant_subscription",
      productId: PRODUCT_ID,
      planId: "plan_recurring_current",
      source: "dodo_subscription",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      status: "active",
      externalCustomerId: "customer_1",
      amountCents: 999,
      currencyCode: "USD",
      metadata: { providerObservedAt: "2026-07-12T00:00:00.000Z" },
    }
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(existingGrant)
    txMock.plan.findUnique
      .mockResolvedValueOnce({
        id: "plan_recurring_upgrade",
        type: "recurring_price",
        isDefault: false,
      })
      .mockResolvedValueOnce({
        id: "plan_recurring_current",
        type: "recurring_price",
        isDefault: false,
      })
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_recurring_current",
        planAssignedAt: new Date("2026-07-01T00:00:00.000Z"),
        subscriptionId: "sub_1",
        status: "published",
        publishedAt: new Date("2026-07-01T00:00:00.000Z"),
      })
    txMock.productPlanGrant.upsert.mockResolvedValueOnce(existingGrant)
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_subscription",
        planId: "plan_recurring_current",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        source: "dodo_subscription",
        externalSubscriptionId: "sub_1",
        plan: { price: 999 },
      },
    ])

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_1",
        status: "active",
        previous_billing_date: "2026-07-01T00:00:00.000Z",
        next_billing_date: "2026-08-01T00:00:00.000Z",
        product_id: "dodo_recurring_upgrade",
        recurring_pre_tax_amount: 999,
        currency: "USD",
        customer: {
          customer_id: "customer_1",
          email: "owner@example.com",
        },
        metadata: {
          productId: PRODUCT_ID,
          userId: "user_1",
        },
      },
      { now: NOW, planChangePaymentSucceeded: false },
    )

    expect(synchronization.outcome).toBe("duplicate")
    expect(txMock.productPlanGrant.upsert).toHaveBeenCalledWith({
      where: { externalSubscriptionId: "sub_1" },
      create: expect.objectContaining({ planId: "plan_recurring_current" }),
      update: expect.objectContaining({ planId: "plan_recurring_current" }),
    })
    expect(txMock.product.update).not.toHaveBeenCalled()
  })

  it("keeps the metadata baseline on an unpaid first ledger sync", async () => {
    txMock.productPlanGrant.findUnique.mockResolvedValueOnce(null)
    txMock.plan.findUnique
      .mockResolvedValueOnce({
        id: "plan_recurring_upgrade",
        type: "recurring_price",
        isDefault: false,
      })
      .mockResolvedValueOnce({
        id: "plan_recurring_current",
        type: "recurring_price",
        isDefault: false,
      })
    txMock.product.findUnique
      .mockResolvedValueOnce(ownerProduct)
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        planId: "plan_free",
        planAssignedAt: null,
        subscriptionId: null,
        status: "draft",
        publishedAt: null,
      })
    txMock.productPlanGrant.upsert.mockResolvedValueOnce({
      id: "grant_subscription",
    })
    txMock.productPlanGrant.findMany.mockResolvedValueOnce([
      {
        id: "grant_subscription",
        planId: "plan_recurring_current",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        source: "dodo_subscription",
        externalSubscriptionId: "sub_1",
        plan: { price: 999 },
      },
    ])
    txMock.product.update.mockResolvedValueOnce({ id: PRODUCT_ID })

    const synchronization = await syncDodoSubscriptionGrant(
      {
        subscription_id: "sub_1",
        status: "active",
        created_at: "2026-07-01T00:00:00.000Z",
        previous_billing_date: "2026-07-01T00:00:00.000Z",
        next_billing_date: "2026-08-01T00:00:00.000Z",
        product_id: "dodo_recurring_upgrade",
        customer: {
          customer_id: "customer_1",
          email: "owner@example.com",
        },
        metadata: {
          productId: PRODUCT_ID,
          planId: "plan_recurring_current",
          userId: "user_1",
        },
      },
      { now: NOW, planChangePaymentSucceeded: false },
    )

    expect(synchronization.outcome).toBe("applied")
    expect(txMock.productPlanGrant.upsert).toHaveBeenCalledWith({
      where: { externalSubscriptionId: "sub_1" },
      create: expect.objectContaining({ planId: "plan_recurring_current" }),
      update: expect.objectContaining({ planId: "plan_recurring_current" }),
    })
  })
})
