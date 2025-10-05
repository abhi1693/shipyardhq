import { beforeEach, describe, expect, it, vi } from "vitest"

const sendEmailMock = vi.hoisted(() => vi.fn())
const getAppBaseUrlMock = vi.hoisted(() => vi.fn(() => "https://app.test"))
const templateSpy = vi.hoisted(() => vi.fn((props: any) => props))

const prismaMock = vi.hoisted(() => ({
  product: {
    findUnique: vi.fn(),
  },
  productAnalytics: {
    findUnique: vi.fn(),
  },
  productUpvote: {
    count: vi.fn(),
  },
}))

const handlerStore = vi.hoisted(() => ({
  handlers: [] as Array<(payload: unknown) => void>,
}))

const onSpy = vi.hoisted(() =>
  vi.fn((_event: string, handler: (payload: unknown) => void) => {
    handlerStore.handlers.push(handler)
    return () => {}
  }),
)

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/email/utils", () => ({
  getAppBaseUrl: getAppBaseUrlMock,
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/routes", () => ({
  memberProductPath: (slug: string) => `/member/products/${slug}`,
  productPath: (slug: string) => `/products/${slug}`,
}))

vi.mock("@/lib/email/templates/product/productVoteMilestone", () => ({
  __esModule: true,
  default: templateSpy,
}))

vi.mock("@/lib/server/events", () => ({
  __esModule: true,
  on: onSpy,
}))

import { handleProductVoteMilestone } from "@/lib/server/email/productVoteMilestone"

describe("handleProductVoteMilestone", () => {
  const event = {
    productId: "prod-1",
    userId: "user-2",
    upvoteId: "vote-1",
    occurredAt: new Date("2024-03-01T10:15:00Z"),
  }

  beforeEach(() => {
    sendEmailMock.mockReset()
    getAppBaseUrlMock.mockClear()
    templateSpy.mockClear()
    handlerStore.handlers.length = 0
    onSpy.mockClear()
    Object.values(prismaMock).forEach((model) => {
      if (model && typeof model === "object") {
        Object.values(model).forEach((fn) => {
          if (typeof fn === "function" && "mockReset" in fn) {
            ;(fn as any).mockReset()
          }
        })
      }
    })
  })

  it("skips when product is missing", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null)

    await handleProductVoteMilestone(event as any)

    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("sends email for first upvote milestone", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod-1",
      name: "Wave Tracker",
      slug: "wave-tracker",
      userId: "owner-1",
      user: {
        id: "owner-1",
        email: "owner@example.com",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 1,
    })

    await handleProductVoteMilestone(event as any)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.subject).toBe("Wave Tracker just received its first upvote")

    const element = payload.react
    expect(element.props.ownerName).toBe("Kai Sailor")
    expect(element.props.milestone).toBe(1)
    expect(element.props.totalUpvotes).toBe(1)
    expect(element.props.productUrl).toBe(
      "https://app.test/products/wave-tracker",
    )
    expect(element.props.dashboardUrl).toBe(
      "https://app.test/member/products/wave-tracker",
    )
  })

  it("sends email for larger milestone using analytics count", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod-1",
      name: "Wave Tracker",
      slug: "wave-tracker",
      userId: "owner-1",
      user: {
        id: "owner-1",
        email: "owner@example.com",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 10,
    })

    await handleProductVoteMilestone(event as any)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0].subject).toBe(
      "Wave Tracker just hit 10+ upvotes",
    )
    expect(sendEmailMock.mock.calls[0][0].react.props.milestone).toBe(10)
  })

  it("falls back to counting upvotes when analytics missing", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod-1",
      name: "Wave Tracker",
      slug: "wave-tracker",
      userId: "owner-1",
      user: {
        id: "owner-1",
        email: "owner@example.com",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce(null)
    prismaMock.productUpvote.count.mockResolvedValueOnce(25)

    await handleProductVoteMilestone(event as any)

    expect(prismaMock.productUpvote.count).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
    })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0].react.props.milestone).toBe(25)
  })

  it("does not send when milestone not crossed", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod-1",
      name: "Wave Tracker",
      slug: "wave-tracker",
      userId: "owner-1",
      user: {
        id: "owner-1",
        email: "owner@example.com",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 5,
    })

    await handleProductVoteMilestone(event as any)

    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("skips when owner email missing", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod-1",
      name: "Wave Tracker",
      slug: "wave-tracker",
      userId: "owner-1",
      user: {
        id: "owner-1",
        email: "",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 1,
    })

    await handleProductVoteMilestone(event as any)

    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("skips when owner upvotes their own product", async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce({
      id: "prod-1",
      name: "Wave Tracker",
      slug: "wave-tracker",
      userId: "user-2",
      user: {
        id: "user-2",
        email: "owner@example.com",
        firstName: "Kai",
        lastName: "Sailor",
      },
    })

    prismaMock.productAnalytics.findUnique.mockResolvedValueOnce({
      upvotes: 1,
    })

    await handleProductVoteMilestone(event as any)

    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
