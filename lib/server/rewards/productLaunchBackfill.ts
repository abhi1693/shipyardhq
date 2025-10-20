import prisma from "@/lib/prisma"
import { awardRewardsSafely } from "@/lib/server/rewards/helpers"

const PRODUCT_CREATED_RULE_KEY = "rewards.product.create"

export async function runProductLaunchBackfill() {
  try {
    const totalProducts = await prisma.product.count()
    console.info("[rewards.launch-backfill] scanning products", {
      totalProducts,
    })

    const products = await prisma.product.findMany({
      select: { id: true, userId: true, slug: true },
      orderBy: { id: "asc" },
    })

    let awarded = 0
    let skippedMissingOwner = 0
    let skippedAlreadyAwarded = 0

    for (const { id, userId, slug } of products) {
      if (!userId) {
        skippedMissingOwner += 1
        console.warn("[rewards.launch-backfill] skipping product without owner", {
          productId: id,
        })
        continue
      }

      const eventId = `product.created:${id}`

      const existing = await prisma.rewardTransaction.findFirst({
        where: {
          userId,
          ruleKey: PRODUCT_CREATED_RULE_KEY,
          eventId,
        },
        select: { id: true },
      })

      if (existing) {
        skippedAlreadyAwarded += 1
        console.info("[rewards.launch-backfill] reward already granted", {
          productId: id,
          userId,
          eventId,
        })
        continue
      }

      await awardRewardsSafely(
        userId,
        PRODUCT_CREATED_RULE_KEY,
        {
          eventId,
          productId: id,
          sourceType: "product",
          sourceId: id,
          targetType: "product",
          targetId: id,
          actorUserId: userId,
          metadata: slug ? { slug, bootstrap: true } : { bootstrap: true },
        },
        "bootstrap product launch rewards",
      )

      console.info("[rewards.launch-backfill] reward granted", {
        productId: id,
        userId,
        eventId,
        slug,
      })

      awarded += 1
    }

    console.info("[rewards.launch-backfill] finished", {
      totalProducts,
      rewardsCreated: awarded,
      skippedMissingOwner,
      skippedAlreadyAwarded,
    })
  } catch (error) {
    console.error("[rewards.launch-backfill] failed", error)
    throw error
  }
}
