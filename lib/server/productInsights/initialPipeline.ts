import prisma from "@/lib/prisma"
import { registerEventHandler } from "@/lib/server/events"
import { enqueueProductInsightPipelineJob } from "@/lib/server/productInsights/pipelineQueue"
import type { ProductInsightStageSetId } from "@/types/product-insights"

const INITIAL_STAGE_SET: ProductInsightStageSetId = "default"

registerEventHandler({
  event: "product.created",
  id: "product-insights.initial-pipeline",
  queue: "low",
  handler: async ({ productId }) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          slug: true,
          userId: true,
          insightProfile: {
            select: {
              lastRunAt: true,
            },
          },
        },
      })

      if (!product) return
      if (product.insightProfile?.lastRunAt) return

      const enqueueResult = await enqueueProductInsightPipelineJob({
        productId: product.id,
        requestedByUserId: product.userId ?? null,
        stageSetId: INITIAL_STAGE_SET,
      })

      if (enqueueResult.queued) {
        console.info("[productInsights:autoRun] initial pipeline queued", {
          productId: product.id,
          productSlug: product.slug,
        })
      } else if (enqueueResult.reason === "duplicate") {
        console.info(
          "[productInsights:autoRun] initial pipeline already queued",
          {
            productId: product.id,
            productSlug: product.slug,
          },
        )
      } else {
        console.warn(
          "[productInsights:autoRun] failed to queue initial pipeline",
          {
            productId: product.id,
            productSlug: product.slug,
            reason: enqueueResult.reason,
          },
        )
      }
    } catch (error) {
      console.error(
        "[productInsights:autoRun] initial pipeline scheduling failed",
        {
          productId,
          error,
        },
      )
    }
  },
})
