import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/server/notifications/service"
import { NotificationType } from "@/lib/vendor/prisma/client"

const createMock = vi.hoisted(() => vi.fn())
const findManyMock = vi.hoisted(() => vi.fn())
const countMock = vi.hoisted(() => vi.fn())
const updateManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    notification: {
      create: createMock,
      findMany: findManyMock,
      count: countMock,
      updateMany: updateManyMock,
    },
  },
}))

describe("notifications service", () => {
  beforeEach(() => {
    createMock.mockReset()
    findManyMock.mockReset()
    countMock.mockReset()
    updateManyMock.mockReset()
  })

  it("creates a notification with trimmed message", async () => {
    createMock.mockResolvedValue({
      id: "notif-1",
      type: NotificationType.product_upvote,
      message: "Hello world",
      metadata: { foo: "bar" },
      readAt: null,
      createdAt: new Date("2024-06-01T12:00:00.000Z"),
      updatedAt: new Date("2024-06-01T12:00:00.000Z"),
    })

    const result = await createNotification({
      userId: "user-1",
      type: NotificationType.product_upvote,
      message: "  Hello world  ",
      metadata: { foo: "bar" },
    })

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: NotificationType.product_upvote,
        message: "Hello world",
        metadata: { foo: "bar" },
      },
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        readAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(result.id).toBe("notif-1")
    expect(result.message).toBe("Hello world")
  })

  it("lists notifications with pagination metadata", async () => {
    const now = new Date("2024-06-01T12:00:00.000Z")
    findManyMock.mockResolvedValue([
      {
        id: "notif-1",
        type: NotificationType.product_upvote,
        message: "First",
        metadata: { productName: "ShitPosts" },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "notif-2",
        type: NotificationType.product_review,
        message: "Second",
        metadata: null,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "notif-3",
        type: NotificationType.reward_awarded,
        message: "Third",
        metadata: { rewardAmount: 5 },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ])
    countMock.mockResolvedValue(2)

    const result = await listNotificationsForUser("user-1", {
      limit: 2,
    })

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      take: 3,
      cursor: undefined,
      skip: 0,
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        readAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(countMock).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    })
    expect(result.notifications).toHaveLength(2)
    expect(result.notifications[0].metadata).toEqual({
      productName: "ShitPosts",
    })
    expect(result.notifications[1].readAt).toBe(now.toISOString())
    expect(result.unreadCount).toBe(2)
    expect(result.nextCursor).toBe("notif-2")
  })

  it("clamps list limits", async () => {
    findManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    await listNotificationsForUser("user-2", { limit: 999 })

    const args = findManyMock.mock.calls[0][0]
    expect(args.take).toBe(51)
  })

  it("marks a notification as read", async () => {
    updateManyMock.mockResolvedValue({ count: 1 })
    const result = await markNotificationRead("user-1", "notif-1")
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "notif-1", userId: "user-1" },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    })
    expect(result).toBe(true)
  })

  it("returns false when notification not found", async () => {
    updateManyMock.mockResolvedValue({ count: 0 })
    const result = await markNotificationRead("user-1", "missing")
    expect(result).toBe(false)
  })

  it("marks all notifications as read", async () => {
    updateManyMock.mockResolvedValue({ count: 5 })
    const result = await markAllNotificationsRead("user-9")
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { userId: "user-9", readAt: null },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    })
    expect(result).toBe(5)
  })
})
