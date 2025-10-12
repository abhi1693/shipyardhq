import prisma from "@/lib/prisma"
import { ProductStatus } from "@/lib/vendor/prisma/client"
import { sendBacklinkReminderEmail } from "@/lib/server/email/productBacklinkReminder"

export const BACKLINK_REMINDER_LOG_PREFIX =
  "[cron.rewards.backlink-reminder]" as const

export type BacklinkReminderSummary = {
  candidates: number
  emailed: number
  skippedNoEmail: number
  failures: Array<{ productId: string; reason: string }>
}

export async function runBacklinkReminder(
  now: Date = new Date(),
): Promise<BacklinkReminderSummary> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.published,
      verification: {
        isVerified: true,
        backlinkIsVerified: false,
        backlinkVerifiedAt: null,
      },
    },
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

  console.info(`${BACKLINK_REMINDER_LOG_PREFIX} fetched candidates`, {
    count: products.length,
  })

  const summary: BacklinkReminderSummary = {
    candidates: products.length,
    emailed: 0,
    skippedNoEmail: 0,
    failures: [],
  }

  for (const product of products) {
    const ownerEmail = product.user?.email?.trim()
    if (!ownerEmail) {
      summary.skippedNoEmail += 1
      console.warn(`${BACKLINK_REMINDER_LOG_PREFIX} missing owner email`, {
        productId: product.id,
        slug: product.slug,
      })
      continue
    }

    try {
      await sendBacklinkReminderEmail({
        ownerEmail,
        ownerFirstName: product.user?.firstName,
        ownerLastName: product.user?.lastName,
        productName: product.name,
        productSlug: product.slug,
      })
      summary.emailed += 1
      console.info(`${BACKLINK_REMINDER_LOG_PREFIX} reminder sent`, {
        productId: product.id,
        slug: product.slug,
        timestamp: now.toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      summary.failures.push({ productId: product.id, reason: message })
      console.error(`${BACKLINK_REMINDER_LOG_PREFIX} send failed`, {
        productId: product.id,
        slug: product.slug,
        message,
      })
    }
  }

  console.info(`${BACKLINK_REMINDER_LOG_PREFIX} reminder summary`, summary)

  return summary
}
