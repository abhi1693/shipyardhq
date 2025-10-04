import { beforeEach, describe, expect, it, vi } from "vitest"

const findManyMock = vi.hoisted(() => vi.fn())
const findUniqueMock = vi.hoisted(() => vi.fn())
const userFindManyMock = vi.hoisted(() => vi.fn())
const countMock = vi.hoisted(() => vi.fn())
const upsertMock = vi.hoisted(() => vi.fn())
const deleteMock = vi.hoisted(() => vi.fn())
const checkRoleMock = vi.hoisted(() => vi.fn())
const revalidatePathMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  default: {
    newsletterSubscription: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      count: countMock,
      upsert: upsertMock,
      delete: deleteMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  },
}))

vi.mock("@/lib/roles", () => ({
  checkRole: checkRoleMock,
}))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

import {
  createNewsletterSubscriberAction,
  deleteNewsletterSubscriberAction,
  getNewsletterSubscriberCount,
  getNewsletterSubscribers,
} from "@/actions/admin/newsletter/actions"
import { adminPath } from "@/lib/routes"
import {
  newsletterSubscriberSelect,
  newsletterSubscriberUserSelect,
} from "@/types/admin/newsletter"

const ADMIN_NEWSLETTER_PATH = adminPath("notifications", "newsletter")

describe("admin newsletter actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findManyMock.mockResolvedValue([])
    findUniqueMock.mockResolvedValue(null)
    userFindManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)
    upsertMock.mockResolvedValue({})
    deleteMock.mockResolvedValue({})
    checkRoleMock.mockResolvedValue(true)
  })

  it("gets newsletter subscribers with defaults", async () => {
    const now = new Date("2024-01-01T00:00:00.000Z")
    const subscription = {
      id: "sub_1",
      email: "crew@example.com",
      createdAt: now,
      updatedAt: now,
    }
    const linkedUser = {
      id: "user_1",
      email: "crew@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
    }

    findManyMock.mockResolvedValue([subscription])
    userFindManyMock.mockResolvedValue([linkedUser])

    const result = await getNewsletterSubscribers({ take: 5 })

    expect(result).toEqual([
      {
        ...subscription,
        user: linkedUser,
      },
    ])
    expect(findManyMock).toHaveBeenCalledWith({
      select: newsletterSubscriberSelect,
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    expect(userFindManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            email: { equals: "crew@example.com", mode: "insensitive" },
          },
        ],
      },
      select: newsletterSubscriberUserSelect,
    })
  })

  it("counts newsletter subscribers", async () => {
    countMock.mockResolvedValue(42)
    const total = await getNewsletterSubscriberCount()
    expect(total).toBe(42)
    expect(countMock).toHaveBeenCalledWith({})
  })

  it("requires an email before attempting to create", async () => {
    const formData = new FormData()
    const result = await createNewsletterSubscriberAction(formData)
    expect(result).toEqual({ error: "Please provide an email." })
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it("rejects non-admins when creating", async () => {
    const formData = new FormData()
    formData.append("email", "crew@example.com")
    checkRoleMock.mockResolvedValue(false)

    const result = await createNewsletterSubscriberAction(formData)

    expect(result).toEqual({ error: "Unauthorized" })
    expect(upsertMock).not.toHaveBeenCalled()
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it("creates or updates a subscriber and revalidates the admin list", async () => {
    const formData = new FormData()
    formData.append("email", "Crew@ShipyardHQ.com ")

    const result = await createNewsletterSubscriberAction(formData)

    expect(result).toEqual({ success: true })
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "crew@shipyardhq.com" },
      select: { id: true },
    })
    expect(upsertMock).toHaveBeenCalledWith({
      where: { email: "crew@shipyardhq.com" },
      update: { email: "crew@shipyardhq.com" },
      create: { email: "crew@shipyardhq.com" },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith(ADMIN_NEWSLETTER_PATH)
  })

  it("returns an error when the subscriber already exists", async () => {
    const formData = new FormData()
    formData.append("email", "crew@example.com")
    findUniqueMock.mockResolvedValue({ id: "sub_1" })

    const result = await createNewsletterSubscriberAction(formData)

    expect(result).toEqual({ error: "This email is already subscribed." })
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "crew@example.com" },
      select: { id: true },
    })
    expect(upsertMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("bubbles up create errors with a friendly message", async () => {
    const formData = new FormData()
    formData.append("email", "crew@example.com")
    upsertMock.mockRejectedValue(new Error("boom"))

    const result = await createNewsletterSubscriberAction(formData)

    expect(result).toEqual({
      error: "We couldn't add that subscriber just yet. Please try again.",
    })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("requires admin privileges before deleting", async () => {
    checkRoleMock.mockResolvedValue(false)
    const result = await deleteNewsletterSubscriberAction("sub_42")
    expect(result).toEqual({ error: "Unauthorized" })
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("deletes a subscriber and revalidates the admin page", async () => {
    const result = await deleteNewsletterSubscriberAction("sub_42")

    expect(result).toEqual({ success: true })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "sub_42" } })
    expect(revalidatePathMock).toHaveBeenCalledWith(ADMIN_NEWSLETTER_PATH)
  })

  it("translates Prisma not found errors when deleting", async () => {
    const prismaError = { code: "P2025" }
    deleteMock.mockRejectedValue(prismaError)

    const result = await deleteNewsletterSubscriberAction("missing")

    expect(result).toEqual({ error: "Subscriber not found." })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("handles unexpected delete failures", async () => {
    deleteMock.mockRejectedValue(new Error("kaboom"))

    const result = await deleteNewsletterSubscriberAction("sub_1")

    expect(result).toEqual({
      error: "We couldn't remove that subscriber. Please try again soon.",
    })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
