import { sendEmail } from "@/lib/email/resend"
import ProductReviewMilestoneEmail from "@/lib/email/templates/product/productReviewMilestone"
import { getAppBaseUrl } from "@/lib/email/utils"
import prisma from "@/lib/prisma"
import { getProductReviewSummary } from "@/lib/server/productReviews"
import { memberProductPath, productPath } from "@/lib/routes"

const DAY_IN_MS = 24 * 60 * 60 * 1000
const REVIEW_MILESTONES = [1, 5, 10, 25, 50, 100]

function buildAbsoluteUrl(path: string) {
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (!parts.length) return "there"
  return parts.join(" ")
}

type ReviewGroup = {
  productId: string
  count: number
}

type ProductReviewGroupCount = {
  productId: string
  _count: { productId: number | null }
}

async function getReviewCounts(
  periodStart: Date,
  periodEnd: Date,
): Promise<ReviewGroup[]> {
  const grouped = (await prisma.productReview.groupBy({
    by: ["productId"],
    where: {
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
      product: {
        status: "published",
      },
    },
    _count: { productId: true },
  })) as ProductReviewGroupCount[]

  return grouped
    .map((group) => ({
      productId: group.productId,
      count: group._count?.productId ?? 0,
    }))
    .filter((entry) => entry.count > 0)
}

export async function sendProductReviewMilestoneEmails(now: Date = new Date()) {
  const periodEnd = now
  const periodStart = new Date(periodEnd.getTime() - DAY_IN_MS)
  const reviewGroups = await getReviewCounts(periodStart, periodEnd)

  if (!reviewGroups.length) {
    return { sent: 0, skipped: 0 }
  }

  const productIds = reviewGroups.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  const productMap = new Map(products.map((product) => [product.id, product]))

  let sent = 0
  let skipped = 0

  for (const reviewGroup of reviewGroups) {
    const product = productMap.get(reviewGroup.productId)
    if (!product) {
      skipped += 1
      continue
    }

    const owner = product.user
    const ownerEmail = owner?.email?.trim()
    if (!ownerEmail) {
      skipped += 1
      continue
    }

    try {
      const summary = await getProductReviewSummary(reviewGroup.productId, 1)
      const ownerName = formatName(owner?.firstName, owner?.lastName)

      const totalReviews = summary.totalReviews
      const previousTotal = Math.max(0, totalReviews - reviewGroup.count)

      const milestonesCrossed = REVIEW_MILESTONES.filter(
        (milestone) => previousTotal < milestone && totalReviews >= milestone,
      )

      if (!milestonesCrossed.length) {
        continue
      }

      const milestone = Math.max(...milestonesCrossed)

      await sendEmail({
        to: ownerEmail,
        subject: `${product.name} just hit ${milestone}+ reviews today`,
        react: (
          <ProductReviewMilestoneEmail
            ownerName={ownerName}
            productName={product.name}
            milestone={milestone}
            reviewCount={reviewGroup.count}
            totalReviews={totalReviews}
            periodStart={periodStart}
            periodEnd={periodEnd}
            productUrl={buildAbsoluteUrl(productPath(product.slug))}
            dashboardUrl={buildAbsoluteUrl(memberProductPath(product.slug))}
          />
        ),
      })

      sent += 1
    } catch (error) {
      skipped += 1
      console.error("[email] product review milestone send failed", {
        productId: reviewGroup.productId,
        email: ownerEmail,
        error,
      })
    }
  }

  return { sent, skipped }
}
