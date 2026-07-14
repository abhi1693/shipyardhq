import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { refreshProductPlanGrantCachesFromWorker } from "@/lib/server/productPlanGrantCache"
import { PRODUCT_PLAN_GRANT_BOUNDARY_HANDLER_ID } from "@/lib/server/productPlanGrantBoundarySchedule"
import { recomputeProductPlanGrantProjectionAtBoundary } from "@/lib/server/productPlanGrants"

export async function processProductPlanGrantBoundaryEvent(payload: {
  productId: string
  boundaryAt: string
}) {
  const boundaryAt = new Date(payload.boundaryAt)
  if (!payload.productId || !Number.isFinite(boundaryAt.getTime())) {
    throw new Error("Invalid product plan grant boundary payload")
  }

  const now = new Date()
  if (now < boundaryAt) {
    throw new Error(
      `Product plan grant boundary ran early: ${boundaryAt.toISOString()}`,
    )
  }

  const projection = await recomputeProductPlanGrantProjectionAtBoundary(
    payload.productId,
    now,
  )

  // Always refresh on retries. The first attempt may have committed the
  // projection before a cache refresh failed.
  await refreshProductPlanGrantCachesFromWorker(
    [payload.productId],
    "product-plan-grant.boundary",
  )

  console.info("[plan-grant.boundary] projection recomputed", {
    ...projection,
    boundaryAt: boundaryAt.toISOString(),
    processedAt: now.toISOString(),
  })
}

registerEventHandler({
  event: APP_EVENTS.PRODUCT_PLAN_GRANT_BOUNDARY,
  id: PRODUCT_PLAN_GRANT_BOUNDARY_HANDLER_ID,
  mode: "async",
  queue: "high",
  handler: processProductPlanGrantBoundaryEvent,
})
