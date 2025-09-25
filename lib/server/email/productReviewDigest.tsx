import { sendEmail } from "@/lib/email/resend"
import ProductReviewDigestEmail from "@/lib/email/templates/product/productReviewDigest"
import { getAppBaseUrl } from "@/lib/email/utils"
import {
  getProductReviewSummary,
  getProductReviewsForDigest,
} from "@/lib/server/productReviews"
import { memberProductPath, productPath } from "@/lib/routes"

const DAY_IN_MS = 24 * 60 * 60 * 1000

function buildAbsoluteUrl(path: string) {
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (parts.length === 0) return "Someone"
  return parts.join(" ")
}

export async function sendProductReviewDigestEmails(now: Date = new Date()) {
  const periodEnd = now
  const periodStart = new Date(now.getTime() - DAY_IN_MS)

  const rows = await getProductReviewsForDigest(periodStart, periodEnd)
  if (!rows.length) {
    return { sent: 0, skipped: 0 }
  }

  let skipped = 0
  const grouped = new Map<
    string,
    {
      ownerEmail: string
      ownerName: string
      products: Map<
        string,
        {
          productId: string
          name: string
          slug: string
          reviews: {
            id: string
            rating: number
            message: string
            createdAt: Date
            reviewerName: string
          }[]
        }
      >
    }
  >()

  for (const row of rows) {
    const ownerId = row.product.ownerId
    const ownerEmail = row.product.owner.email
    if (!ownerId || !ownerEmail) {
      skipped += 1
      continue
    }

    const ownerName = formatName(
      row.product.owner.firstName,
      row.product.owner.lastName,
    )
    let bucket = grouped.get(ownerId)
    if (!bucket) {
      bucket = {
        ownerEmail,
        ownerName,
        products: new Map(),
      }
      grouped.set(ownerId, bucket)
    }

    const productMap = bucket.products
    let productBucket = productMap.get(row.product.id)
    if (!productBucket) {
      productBucket = {
        productId: row.product.id,
        name: row.product.name,
        slug: row.product.slug,
        reviews: [],
      }
      productMap.set(row.product.id, productBucket)
    }

    productBucket.reviews.push({
      id: row.id,
      rating: row.rating,
      message: row.message,
      createdAt: row.createdAt,
      reviewerName: formatName(row.reviewer.firstName, row.reviewer.lastName),
    })
  }

  let sent = 0

  for (const [, ownerData] of grouped) {
    if (!ownerData.ownerEmail) {
      skipped += 1
      continue
    }

    const productSummaries = await Promise.all(
      Array.from(ownerData.products.values()).map(async (product) => {
        const summary = await getProductReviewSummary(product.productId, 10)
        return {
          name: product.name,
          slug: product.slug,
          reviews: product.reviews,
          totalReviews: summary.totalReviews,
          averageRating: summary.averageRating,
        }
      }),
    )

    if (!productSummaries.length) {
      skipped += 1
      continue
    }

    try {
      await sendEmail({
        to: ownerData.ownerEmail,
        subject: `Fresh reviews from Shipyard HQ`,
        react: (
          <ProductReviewDigestEmail
            ownerName={ownerData.ownerName}
            products={productSummaries.map((product) => ({
              name: product.name,
              averageRating: product.averageRating,
              totalReviews: product.totalReviews,
              productUrl: buildAbsoluteUrl(productPath(product.slug)),
              dashboardUrl: buildAbsoluteUrl(memberProductPath(product.slug)),
              reviews: product.reviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                message: review.message,
                createdAt: review.createdAt,
                reviewerName: review.reviewerName,
              })),
            }))}
            periodStart={periodStart}
            periodEnd={periodEnd}
          />
        ),
      })
      sent += 1
    } catch (error) {
      skipped += 1
      console.error("[email] product review digest send failed", {
        email: ownerData.ownerEmail,
        error,
      })
    }
  }

  return { sent, skipped }
}
