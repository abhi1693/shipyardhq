import { sendEmail } from "@/lib/email/resend"
import ProductBacklinkVerifiedEmail from "@/lib/email/templates/product/productBacklinkVerified"
import { getAppBaseUrl } from "@/lib/email/utils"
import prisma from "@/lib/prisma"
import {
  MEMBER_REWARDS_PATH,
  memberProductPath,
  productPath,
} from "@/lib/routes"
import { on, type RewardsAwardedEvent } from "@/lib/server/events"

const BACKLINK_REWARD_RULE = "rewards.backlink.verify"

type BacklinkRewardMetadata = {
  slug?: string | null
  backlinkUrl?: string | null
  verifiedAt?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value
  }
  return null
}

function parseMetadata(metadata: unknown): BacklinkRewardMetadata {
  if (!isRecord(metadata)) {
    return {}
  }
  const slug = toStringOrNull(metadata.slug)
  const backlinkUrl = toStringOrNull(metadata.backlinkUrl)
  const verifiedAt = toStringOrNull(metadata.verifiedAt)
  return { slug, backlinkUrl, verifiedAt }
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (!parts.length) return "there"
  return parts.join(" ")
}

function buildAbsoluteUrl(path: string) {
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

function coerceVerifiedAt(
  metadataValue: string | null,
  fallback: Date,
): Date {
  if (!metadataValue) return fallback
  const timestamp = Date.parse(metadataValue)
  if (Number.isNaN(timestamp)) {
    return fallback
  }
  return new Date(timestamp)
}

export async function handleBacklinkVerifiedReward(
  event: RewardsAwardedEvent,
): Promise<void> {
  if (event.ruleKey !== BACKLINK_REWARD_RULE) {
    return
  }

  const { slug: metadataSlug, backlinkUrl, verifiedAt } = parseMetadata(
    event.metadata,
  )

  if (!event.productId) {
    console.warn("[email] backlink reward missing product context", {
      transactionId: event.transactionId,
    })
    return
  }

  const product = await prisma.product.findUnique({
    where: { id: event.productId },
    select: {
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

  if (!product) {
    console.warn("[email] backlink reward product not found", {
      productId: event.productId,
      transactionId: event.transactionId,
    })
    return
  }

  const ownerEmail = product.user?.email?.trim()
  if (!ownerEmail) {
    console.warn("[email] backlink reward owner email missing", {
      productId: event.productId,
      transactionId: event.transactionId,
    })
    return
  }

  const productSlug = product.slug ?? metadataSlug
  if (!productSlug) {
    console.warn("[email] backlink reward slug missing", {
      productId: event.productId,
      transactionId: event.transactionId,
    })
    return
  }

  const backlinkTarget = backlinkUrl ?? buildAbsoluteUrl(productPath(productSlug))
  const verifiedTimestamp = coerceVerifiedAt(verifiedAt, event.createdAt)
  const ownerName = formatName(product.user?.firstName, product.user?.lastName)
  const productName = product.name ?? productSlug

  const dashboardUrl = buildAbsoluteUrl(memberProductPath(productSlug))
  const rewardsUrl = buildAbsoluteUrl(MEMBER_REWARDS_PATH)
  const productUrl = buildAbsoluteUrl(productPath(productSlug))

  const subject = `${productName} backlink verified on Shipyard`

  try {
    await sendEmail({
      to: ownerEmail,
      subject,
      react: (
        <ProductBacklinkVerifiedEmail
          ownerName={ownerName}
          productName={productName}
          productUrl={productUrl}
          dashboardUrl={dashboardUrl}
          rewardsUrl={rewardsUrl}
          backlinkUrl={backlinkTarget}
          verifiedAt={verifiedTimestamp}
        />
      ),
    })
  } catch (error) {
    console.error("[email] backlink reward send failed", {
      productId: event.productId,
      transactionId: event.transactionId,
      error,
    })
  }
}

on("rewards.awarded", (event) => {
  handleBacklinkVerifiedReward(event).catch((error) => {
    console.error("[email] backlink reward handler crashed", {
      transactionId: event.transactionId,
      error,
    })
  })
})
