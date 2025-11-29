import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { refreshLeaderboardForProducts } from "@/lib/server/leaderboard/v2"

const reviewSelection = {
  id: true,
  rating: true,
  message: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const satisfies Prisma.ProductReviewSelect

type ReviewRow = Prisma.ProductReviewGetPayload<{
  select: typeof reviewSelection
}>

export type ProductReviewView = {
  id: string
  rating: number
  message: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    firstName: string | null
    lastName: string | null
  }
}

export type ProductReviewSummary = {
  averageRating: number
  totalReviews: number
  reviews: ProductReviewView[]
}

function mapReviewRow(row: ReviewRow): ProductReviewView {
  return {
    id: row.id,
    rating: row.rating,
    message: row.message,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.user.id,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
    },
  }
}

export const getProductReviewSummary = cached(
  async (productId: string, limit = 25): Promise<ProductReviewSummary> => {
    if (!productId) {
      return { averageRating: 0, totalReviews: 0, reviews: [] }
    }

    const take = Math.max(1, Math.min(50, limit))

    const [rows, aggregate] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId },
        select: reviewSelection,
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.productReview.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ])

    const rawAverage = aggregate._avg?.rating ?? null
    const averageRating =
      rawAverage === null || Number.isNaN(rawAverage)
        ? 0
        : Math.round(rawAverage * 10) / 10
    const totalReviews = aggregate._count?._all ?? 0

    return {
      averageRating,
      totalReviews,
      reviews: rows.map(mapReviewRow),
    }
  },
  "product:review-summary",
  {
    ttl: DEFAULT_TTL.fast,
    tags: ([productId]) => [
      TAGS.productReviews,
      TAGS.productReview(String(productId)),
    ],
  },
)

export async function getUserProductReview(productId: string, userId: string) {
  if (!productId || !userId) return null
  return prisma.productReview.findUnique({
    where: { productId_userId: { productId, userId } },
  })
}

type UpsertProductReviewInput = {
  productId: string
  userId: string
  rating: number
  message: string
}

export async function upsertProductReview(options: UpsertProductReviewInput) {
  const { productId, userId, rating, message } = options
  if (!productId) throw new Error("Missing productId")
  if (!userId) throw new Error("Missing userId")

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("Rating must be between 0 and 5")
  }

  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    throw new Error("Message is required")
  }

  const review = await prisma.productReview.upsert({
    where: { productId_userId: { productId, userId } },
    update: { rating: Math.round(rating), message: trimmedMessage },
    create: {
      productId,
      userId,
      rating: Math.round(rating),
      message: trimmedMessage,
    },
  })

  // Ensure leaderboard aggregates incorporate this review.
  try {
    await refreshLeaderboardForProducts({
      productIds: [productId],
      now: review.updatedAt,
    })
  } catch (error) {
    console.error("[leaderboard] review refresh failed", {
      productId,
      error,
    })
  }

  return review
}

export async function getProductReviewsForDigest(since: Date, until: Date) {
  const rows = await prisma.productReview.findMany({
    where: {
      createdAt: {
        gte: since,
        lt: until,
      },
      product: {
        status: "published",
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      rating: true,
      message: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  return rows.map((row: (typeof rows)[number]) => ({
    id: row.id,
    rating: row.rating,
    message: row.message,
    createdAt: row.createdAt,
    product: {
      id: row.product.id,
      slug: row.product.slug,
      name: row.product.name,
      ownerId: row.product.userId,
      owner: {
        id: row.product.user.id,
        email: row.product.user.email,
        firstName: row.product.user.firstName,
        lastName: row.product.user.lastName,
      },
    },
    reviewer: {
      id: row.user.id,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
    },
  }))
}
