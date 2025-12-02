import prisma from "@/lib/prisma"
import { memberProductEditPath } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sendRewardsNotificationToNovu } from "@/lib/server/notifications/novuRewards"

type BacklinkReminderContext = {
  ownerEmail: string
  ownerFirstName?: string | null
  ownerLastName?: string | null
  ownerClerkId?: string | null
  productName: string
  productSlug: string
}

const BACKLINK_REWARD_POINTS = 30

function buildAbsoluteUrl(path: string) {
  const base = resolveSiteUrl()
  return new URL(path, `${base}/`).toString()
}

async function resolveRecipient(
  productSlug: string,
  ownerClerkId?: string | null,
) {
  const subscriberId = ownerClerkId?.trim()
  if (subscriberId) {
    return { subscriberId }
  }

  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true, user: { select: { clerkId: true } } },
  })

  const fromProduct = product?.user?.clerkId?.trim()
  if (fromProduct) {
    return { subscriberId: fromProduct, productId: product?.id ?? null }
  }

  return { subscriberId: null, productId: product?.id ?? null }
}

export async function sendBacklinkReminderEmail({
  ownerEmail,
  ownerFirstName,
  ownerLastName,
  ownerClerkId,
  productName,
  productSlug,
}: BacklinkReminderContext): Promise<void> {
  const dashboardUrl = buildAbsoluteUrl(memberProductEditPath(productSlug))

  const subject = `${productName} can earn ${BACKLINK_REWARD_POINTS} rewards with a Shipyard backlink`

  try {
    const recipient = await resolveRecipient(productSlug, ownerClerkId)
    if (recipient.subscriberId) {
      await sendRewardsNotificationToNovu({
        kind: "reward_backlink_reminder",
        message: `Add a Shipyard backlink to earn ${BACKLINK_REWARD_POINTS} rewards and unlock verification.`,
        subject,
        recipient: {
          subscriberId: recipient.subscriberId,
          email: ownerEmail,
          firstName: ownerFirstName ?? undefined,
          lastName: ownerLastName ?? undefined,
        },
        reward: {
          amount: BACKLINK_REWARD_POINTS,
          ruleKey: "rewards.backlink.verify",
          productId: recipient.productId ?? null,
          reason: "backlink_reminder",
        },
        links: { member: memberProductEditPath(productSlug) },
        context: {
          reward_backlink_reminder: {
            productId: recipient.productId ?? null,
            productSlug,
            productName,
            rewardPoints: BACKLINK_REWARD_POINTS,
          },
        },
        tags: ["rewards", "backlink", "reminder"],
        transactionId: `reward_backlink_reminder:${productSlug}`,
      })
    } else {
      console.info("[novu] skip backlink reminder; missing subscriber id", {
        productSlug,
      })
    }
  } catch (error) {
    console.error("[novu] failed to send backlink reminder notification", {
      error,
      productSlug,
    })
  }
}
