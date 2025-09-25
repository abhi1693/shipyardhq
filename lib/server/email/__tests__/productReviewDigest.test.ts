import { beforeEach, describe, expect, it, vi } from "vitest"

const sendEmailMock = vi.hoisted(() => vi.fn())
const getProductReviewsForDigestMock = vi.hoisted(() => vi.fn())
const getProductReviewSummaryMock = vi.hoisted(() => vi.fn())
const getAppBaseUrlMock = vi.hoisted(() => vi.fn(() => "https://app.test"))

vi.mock("@/lib/email/resend", () => ({
  sendEmail: sendEmailMock,
}))

vi.mock("@/lib/server/productReviews", () => ({
  getProductReviewsForDigest: getProductReviewsForDigestMock,
  getProductReviewSummary: getProductReviewSummaryMock,
}))

vi.mock("@/lib/email/utils", () => ({
  getAppBaseUrl: getAppBaseUrlMock,
}))

const templateSpy = vi.hoisted(() => vi.fn((props: any) => props))
vi.mock("@/lib/email/templates/product/productReviewDigest", () => ({
  __esModule: true,
  default: templateSpy,
}))

vi.mock("@/lib/routes", () => ({
  memberProductPath: (slug: string) => `/member/products/${slug}`,
  productPath: (slug: string) => `/products/${slug}`,
}))

import { sendProductReviewDigestEmails } from "@/lib/server/email/productReviewDigest"

describe("sendProductReviewDigestEmails", () => {
  beforeEach(() => {
    sendEmailMock.mockReset()
    getProductReviewsForDigestMock.mockReset()
    getProductReviewSummaryMock.mockReset()
    templateSpy.mockClear()
  })

  it("returns early when there are no reviews", async () => {
    getProductReviewsForDigestMock.mockResolvedValue([])

    const result = await sendProductReviewDigestEmails(
      new Date("2024-01-10T08:00:00Z"),
    )

    expect(result).toEqual({ sent: 0, skipped: 0 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it("groups reviews by owner and sends digest", async () => {
    const now = new Date("2024-01-10T08:00:00Z")
    const createdAt = new Date("2024-01-09T16:00:00Z")

    getProductReviewsForDigestMock.mockResolvedValue([
      {
        id: "rev-1",
        rating: 5,
        message: "Fantastic",
        createdAt,
        product: {
          id: "prod-1",
          slug: "product-one",
          name: "Product One",
          ownerId: "owner-1",
          owner: {
            id: "owner-1",
            email: "owner@example.com",
            firstName: "Olivia",
            lastName: "Builder",
          },
        },
        reviewer: {
          id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      },
      {
        id: "rev-2",
        rating: 4,
        message: "Works well",
        createdAt,
        product: {
          id: "prod-2",
          slug: "product-two",
          name: "Product Two",
          ownerId: "owner-1",
          owner: {
            id: "owner-1",
            email: "owner@example.com",
            firstName: "Olivia",
            lastName: "Builder",
          },
        },
        reviewer: {
          id: "user-2",
          firstName: "Grace",
          lastName: "Hopper",
        },
      },
    ])

    getProductReviewSummaryMock.mockImplementation(
      async (productId: string) => {
        return productId === "prod-1"
          ? { averageRating: 4.8, totalReviews: 12, reviews: [] }
          : { averageRating: 4.2, totalReviews: 5, reviews: [] }
      },
    )

    const result = await sendProductReviewDigestEmails(now)

    expect(result).toEqual({ sent: 1, skipped: 0 })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.to).toBe("owner@example.com")
    expect(payload.subject).toBe("Fresh reviews from Shipyard HQ")

    const element = payload.react
    expect(element.props.ownerName).toBe("Olivia Builder")
    expect(element.props.products).toHaveLength(2)

    const firstProduct = element.props.products.find(
      (p: any) => p.name === "Product One",
    )
    expect(firstProduct.averageRating).toBe(4.8)
    expect(firstProduct.totalReviews).toBe(12)
    expect(firstProduct.productUrl).toBe(
      "https://app.test/products/product-one",
    )
    expect(firstProduct.dashboardUrl).toBe(
      "https://app.test/member/products/product-one",
    )
    expect(firstProduct.reviews[0]).toMatchObject({
      reviewerName: "Ada Lovelace",
      rating: 5,
      message: "Fantastic",
    })

    expect(getProductReviewSummaryMock).toHaveBeenCalledWith("prod-1", 10)
    expect(getProductReviewSummaryMock).toHaveBeenCalledWith("prod-2", 10)
  })

  it("skips owners missing email and continues", async () => {
    const now = new Date("2024-01-10T08:00:00Z")
    const createdAt = new Date("2024-01-09T16:00:00Z")

    getProductReviewsForDigestMock.mockResolvedValue([
      {
        id: "rev-1",
        rating: 5,
        message: "Great",
        createdAt,
        product: {
          id: "prod-1",
          slug: "product-one",
          name: "Product One",
          ownerId: "owner-1",
          owner: {
            id: "owner-1",
            email: "",
            firstName: "",
            lastName: "",
          },
        },
        reviewer: {
          id: "user-1",
          firstName: "Ada",
          lastName: "Lovelace",
        },
      },
    ])

    const result = await sendProductReviewDigestEmails(now)
    expect(result).toEqual({ sent: 0, skipped: 1 })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
