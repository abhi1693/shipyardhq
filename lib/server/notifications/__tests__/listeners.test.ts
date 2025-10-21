import { beforeEach, describe, expect, it, vi } from "vitest"

import { APP_EVENTS } from "@/lib/server/events/constants"
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
  let handler:
    | ((payload: any) => Promise<void> | void)
    | undefined

  beforeEach(async () => {
    vi.resetModules()
    productUpvoteFindManyMock.mockReset()
    createNotificationMock.mockReset()

    const eventsModule = await import("@/lib/server/events")
    eventsModule.resetEventRegistryForTesting()
    await import("@/lib/server/events/register-handlers")

    handler = eventsModule.resolveRegisteredHandler(
      APP_EVENTS.PRODUCT_UPDATE_PUBLISHED,
      "notifications.product-update-published",
    )?.handler
  })

  it("sends notifications to upvoters when a product update is published", async () => {
    expect(handler).toBeDefined()
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

    await handler?.(payload)

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
    expect(handler).toBeDefined()
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

    await handler?.(payload)

    expect(createNotificationMock).not.toHaveBeenCalled()
  })
})
