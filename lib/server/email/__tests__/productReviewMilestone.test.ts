import { beforeEach, describe, expect, it, vi } from "vitest"

const sendEmailMock = vi.hoisted(() => vi.fn())
const getProductReviewSummaryMock = vi.hoisted(() => vi.fn())
const getAppBaseUrlMock = vi.hoisted(() => vi.fn(() => "https://app.test"))

const prismaMock = vi.hoisted(() => ({
  productReview: {
    groupBy: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/server/productReviews", () => ({
  getProductReviewSummary: getProductReviewSummaryMock,
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

const templateSpy = vi.hoisted(() => vi.fn((props: any) => props))
vi.mock("@/lib/email/templates/product/productReviewMilestone", () => ({
  __esModule: true,
  default: templateSpy,
}))

import { sendProductReviewMilestoneEmails } from "@/lib/server/email/productReviewMilestone"

describe("sendProductReviewMilestoneEmails", () => {
  const now = new Date("2024-02-12T13:00:00Z")

  beforeEach(() => {
    prismaMock.productReview.groupBy.mockReset()
    prismaMock.product.findMany.mockReset()
    sendEmailMock.mockReset()
    getProductReviewSummaryMock.mockReset()
    templateSpy.mockClear()
  })

  it("returns early when there are no new reviews", async () => {
    prismaMock.productReview.groupBy.mockResolvedValue([])

    const result = await sendProductReviewMilestoneEmails(now)

    expect(result).toEqual({ sent: 0, skipped: 0 })
    expect(prismaMock.product.findMany).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("skips products without owner email", async () => {
    prismaMock.productReview.groupBy.mockResolvedValue([
      {
        productId: "prod-1",
        _count: { productId: 3 },
      },
    ])

    prismaMock.product.findMany.mockResolvedValue([
      {
        id: "prod-1",
        name: "Acme",
        slug: "acme",
        user: { email: null, firstName: "Olivia", lastName: "Builder" },
      },
    ])

    getProductReviewSummaryMock.mockResolvedValue({
      averageRating: 4.5,
      totalReviews: 10,
      reviews: [],
    })

    const result = await sendProductReviewMilestoneEmails(now)

    expect(result).toEqual({ sent: 0, skipped: 1 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("sends milestone email when thresholds are crossed", async () => {
    prismaMock.productReview.groupBy.mockResolvedValue([
      {
        productId: "prod-2",
        _count: { productId: 7 },
      },
    ])

    prismaMock.product.findMany.mockResolvedValue([
      {
        id: "prod-2",
        name: "Wave Tracker",
        slug: "wave-tracker",
        user: {
          email: "owner@example.com",
          firstName: "Kai",
          lastName: "Sailor",
        },
      },
    ])

    getProductReviewSummaryMock.mockResolvedValue({
      averageRating: 4.7,
      totalReviews: 12,
      reviews: [],
    })

    const result = await sendProductReviewMilestoneEmails(now)

    expect(result).toEqual({ sent: 1, skipped: 0 })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.to).toBe("owner@example.com")
    expect(payload.subject).toBe("Wave Tracker just hit 10+ reviews today")

    const element = payload.react
    expect(element.props.ownerName).toBe("Kai Sailor")
    expect(element.props.productName).toBe("Wave Tracker")
    expect(element.props.milestone).toBe(10)
    expect(element.props.reviewCount).toBe(7)
    expect(element.props.totalReviews).toBe(12)
    expect(element.props.productUrl).toBe(
      "https://app.test/products/wave-tracker",
    )
    expect(element.props.dashboardUrl).toBe(
      "https://app.test/member/products/wave-tracker",
    )
  })

  it("does not send when no new milestone was reached", async () => {
    prismaMock.productReview.groupBy.mockResolvedValue([
      {
        productId: "prod-3",
        _count: { productId: 2 },
      },
    ])

    prismaMock.product.findMany.mockResolvedValue([
      {
        id: "prod-3",
        name: "Crew Planner",
        slug: "crew-planner",
        user: {
          email: "crew@example.com",
          firstName: "Morgan",
          lastName: "Lee",
        },
      },
    ])

    getProductReviewSummaryMock.mockResolvedValue({
      averageRating: 4.8,
      totalReviews: 42,
      reviews: [],
    })

    const result = await sendProductReviewMilestoneEmails(now)

    expect(result).toEqual({ sent: 0, skipped: 0 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
