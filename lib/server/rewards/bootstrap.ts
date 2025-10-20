import prisma from "@/lib/prisma"
import { awardRewardsSafely } from "@/lib/server/rewards/helpers"

const PRODUCT_CREATED_RULE_KEY = "rewards.product.create"
const BATCH_SIZE = 200

async function runProductLaunchBackfill() {
  try {
    const total = await prisma.product.count()
    if (!total) {
      return
    }

    console.info("[rewards] bootstrap launch backfill start", { total })

    let processed = 0
    let cursor: string | undefined

    while (true) {
      const batch = await prisma.product.findMany({
        select: { id: true, userId: true, slug: true },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      if (!batch.length) break

      await Promise.all(
        batch.map(async ({ id, userId, slug }) => {
          if (!userId) return
          const eventId = `product.created:${id}`
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
        }),
      )

      processed += batch.length
      cursor = batch[batch.length - 1].id
    }

    console.info("[rewards] bootstrap launch backfill complete", {
      processed,
    })
  } catch (error) {
    console.error("[rewards] bootstrap launch backfill failed", { error })
  }
}

type GlobalBootstrapState = {
  __shipyardProductLaunchBackfill?: Promise<void>
}

const globalState = globalThis as typeof globalThis & GlobalBootstrapState

if (!globalState.__shipyardProductLaunchBackfill) {
  globalState.__shipyardProductLaunchBackfill = runProductLaunchBackfill()
}

export const productLaunchBackfillPromise =
  globalState.__shipyardProductLaunchBackfill
