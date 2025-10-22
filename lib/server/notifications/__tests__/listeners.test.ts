import { beforeEach, describe, expect, it, vi } from "vitest"

import { APP_EVENTS } from "@/lib/server/events/constants"
import { MEMBER_REWARDS_PATH } from "@/lib/routes"
import { NotificationType } from "@/lib/vendor/prisma/client"

const productUpvoteFindManyMock = vi.hoisted(() => vi.fn())
const createNotificationMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    productUpvote: {
      findMany: productUpvoteFindManyMock,
    },
    product: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/server/notifications/service", () => ({
  createNotification: createNotificationMock,
}))

describe("notifications listeners", () => {
  type EventsModule = typeof import("@/lib/server/events")
  let eventsModule: EventsModule | undefined
  let productUpdateHandler: ((payload: any) => Promise<void> | void) | undefined

  beforeEach(async () => {
    vi.resetModules()
    productUpvoteFindManyMock.mockReset()
    createNotificationMock.mockReset()

    eventsModule = await import("@/lib/server/events")
    eventsModule.resetEventRegistryForTesting()
    await import("@/lib/server/events/register-handlers")

    productUpdateHandler = eventsModule.resolveRegisteredHandler(
      APP_EVENTS.PRODUCT_UPDATE_PUBLISHED,
      "notifications.product-update-published",
    )?.handler
  })

  it("sends notifications to upvoters when a product update is published", async () => {
    expect(productUpdateHandler).toBeDefined()
    productUpvoteFindManyMock.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ])
    createNotificationMock.mockResolvedValue(undefined)

    const payload = {
      productId: "product-1",
      productSlug: "amazing-app",
      productName: "Amazing App",
      productOwnerId: "owner-1",
      updateId: "update-1",
      updateTitle: "Launch v2",
      updateSummary: "Lots of cool things",
      updatePublishedAt: new Date("2024-10-01T12:00:00.000Z").toISOString(),
      authorId: "owner-1",
    } as any

    await productUpdateHandler?.(payload)

    const expectedType =
      (NotificationType as Record<string, string | undefined>).product_update ??
      NotificationType.system

    expect(createNotificationMock).toHaveBeenCalledTimes(2)
    const [firstCall] = createNotificationMock.mock.calls
    expect(firstCall[0]).toMatchObject({
      userId: "user-1",
      type: expectedType,
      message: "New update on Amazing App: Launch v2",
      metadata: expect.objectContaining({
        href: "/products/amazing-app",
        productId: "product-1",
        updateId: "update-1",
        notificationKind: "product_update",
      }),
    })
  })

  it("skips notifications when only excluded users have upvoted", async () => {
    expect(productUpdateHandler).toBeDefined()
    productUpvoteFindManyMock.mockResolvedValue([
      { userId: "owner-1" },
      { userId: "author-1" },
    ])

    const payload = {
      productId: "product-1",
      productSlug: "amazing-app",
      productName: "Amazing App",
      productOwnerId: "owner-1",
      updateId: "update-1",
      updateTitle: "Launch v2",
      updateSummary: null,
      updatePublishedAt: new Date("2024-10-01T12:00:00.000Z"),
      authorId: "author-1",
    }

    await productUpdateHandler?.(payload)

    expect(createNotificationMock).not.toHaveBeenCalled()
  })

  it("notifies users when an admin grants rewards", async () => {
    expect(eventsModule).toBeDefined()

    const adjustmentHandler = eventsModule?.resolveRegisteredHandler(
      APP_EVENTS.REWARDS_ADJUSTED,
      "notifications.rewards-adjusted-grant",
    )?.handler

    expect(adjustmentHandler).toBeDefined()

    createNotificationMock.mockResolvedValue(undefined)

    const grantedAt = new Date("2024-10-02T10:00:00.000Z")
    const payload = {
      transactionId: "tx-123",
      userId: "user-42",
      amount: 75,
      balanceAfter: 200,
      createdAt: grantedAt,
      actorUserId: "admin-7",
      notes: "closing the beta feedback loop",
      metadata: {
        source: "admin-panel",
        reference: "case-99",
        initiatedBy: { id: "admin-7", email: "admin@example.com" },
      },
    } as any

    await adjustmentHandler?.(payload)

    expect(createNotificationMock).toHaveBeenCalledTimes(1)
    const [call] = createNotificationMock.mock.calls
    expect(call[0]).toMatchObject({
      userId: "user-42",
      type: NotificationType.reward_awarded,
      message:
        "Shipyard team granted you 75 points — closing the beta feedback loop.",
    })

    expect(call[0].metadata).toMatchObject({
      transactionId: "tx-123",
      rewardAmount: 75,
      balanceAfter: 200,
      actorUserId: "admin-7",
      reason: "closing the beta feedback loop",
      reference: "case-99",
      notificationKind: "admin_reward_grant",
      source: "admin-panel",
      href: MEMBER_REWARDS_PATH,
      grantedAt: grantedAt.toISOString(),
    })
  })

  it("skips reward notifications for deductions", async () => {
    expect(eventsModule).toBeDefined()

    const adjustmentHandler = eventsModule?.resolveRegisteredHandler(
      APP_EVENTS.REWARDS_ADJUSTED,
      "notifications.rewards-adjusted-grant",
    )?.handler

    expect(adjustmentHandler).toBeDefined()

    const payload = {
      transactionId: "tx-456",
      userId: "user-9",
      amount: -25,
      balanceAfter: 50,
      createdAt: new Date("2024-10-02T11:00:00.000Z"),
      actorUserId: "admin-3",
      notes: "cleanup",
    } as any

    await adjustmentHandler?.(payload)

    expect(createNotificationMock).not.toHaveBeenCalled()
  })
})
