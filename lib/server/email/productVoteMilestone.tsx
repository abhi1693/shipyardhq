import { sendEmail } from "@/lib/email/resend"
import ProductVoteMilestoneEmail from "@/lib/email/templates/product/productVoteMilestone"
import { getAppBaseUrl } from "@/lib/email/utils"
import prisma from "@/lib/prisma"
import type { ProductUpvotedEvent } from "@/lib/server/events"
import { registerEventHandler } from "@/lib/server/events"
import { memberProductPath, productPath } from "@/lib/routes"

const VOTE_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000]

function buildAbsoluteUrl(path: string) {
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (!parts.length) return "there"
  return parts.join(" ")
}

async function fetchProductContext(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
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
  })
}

async function resolveTotalUpvotes(productId: string): Promise<number> {
  const analytics = await prisma.productAnalytics.findUnique({
    where: { productId },
    select: { upvotes: true },
  })
  if (typeof analytics?.upvotes === "number") {
    return Math.max(analytics.upvotes, 0)
  }
  const count = await prisma.productUpvote.count({ where: { productId } })
  return count
}

export async function handleProductVoteMilestone(
  event: ProductUpvotedEvent,
): Promise<void> {
  const product = await fetchProductContext(event.productId)
  if (!product) return

  const ownerEmail = product.user?.email?.trim()
  if (!ownerEmail) return
  if (!product.slug) return
  if (product.userId === event.userId) return

  const totalUpvotes = await resolveTotalUpvotes(event.productId)
  const previousTotal = Math.max(totalUpvotes - 1, 0)

  const milestonesCrossed = VOTE_MILESTONES.filter(
    (milestone) => previousTotal < milestone && totalUpvotes >= milestone,
  )

  if (!milestonesCrossed.length) {
    return
  }

  const milestone = Math.max(...milestonesCrossed)
  const ownerName = formatName(product.user?.firstName, product.user?.lastName)

  const subject =
    milestone === 1
      ? `${product.name} just received its first upvote`
      : `${product.name} just hit ${milestone}+ upvotes`

  try {
    await sendEmail({
      to: ownerEmail,
      subject,
      react: (
        <ProductVoteMilestoneEmail
          ownerName={ownerName}
          productName={product.name}
          milestone={milestone}
          totalUpvotes={totalUpvotes}
          occurredAt={event.occurredAt}
          productUrl={buildAbsoluteUrl(productPath(product.slug))}
          dashboardUrl={buildAbsoluteUrl(memberProductPath(product.slug))}
        />
      ),
    })
  } catch (error) {
    console.error("[email] product vote milestone send failed", {
      productId: event.productId,
      ownerEmail,
      error,
    })
  }
}

registerEventHandler({
  event: "product.upvoted",
  id: "email.product-vote-milestone",
  mode: "async",
  handler: (event) => {
    handleProductVoteMilestone(event).catch((error) => {
      console.error("[email] product vote milestone handler crashed", {
        productId: event.productId,
        error,
      })
    })
  },
})
