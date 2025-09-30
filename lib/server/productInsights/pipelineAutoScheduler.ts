import prisma from "@/lib/prisma"
import {
  evaluateInsightsPipelineAccess,
  type InsightsPipelineAccessResult,
} from "@/lib/server/productInsights/access"
import { enqueueProductInsightPipelineJob } from "@/lib/server/productInsights/pipelineQueue"
import type { ProductInsightStageSetId } from "@/types/product-insights"
import { Prisma, ProductStatus } from "@/lib/vendor/prisma/client"

const DEFAULT_LIMIT = 25
const LOOKBACK_DAYS = 7
const DAY_IN_MS = 24 * 60 * 60 * 1000
const DEFAULT_STAGE_SET: ProductInsightStageSetId = "default"

type ScheduleOptions = {
  limit?: number
  staleAfterMs?: number
  stageSetId?: ProductInsightStageSetId
}

type ScheduleResultEntry = {
  productId: string
  productSlug: string
  status: "queued" | "skipped"
  reason?: string
  detail?: InsightsPipelineAccessResult | { reason: string }
}

export type AutoScheduleResult = {
  examined: number
  queued: number
  skipped: number
  limit: number
  staleAfterMs: number
  results: ScheduleResultEntry[]
}

function resolveLimit(value?: number): number {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_LIMIT
  }
  return Math.min(Math.floor(value), 250)
}

function resolveStaleAfterMs(value?: number): number {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return LOOKBACK_DAYS * DAY_IN_MS
  }
  return Math.max(Math.floor(value), DAY_IN_MS)
}

export async function scheduleStaleProductInsightPipelines(
  options: ScheduleOptions = {},
): Promise<AutoScheduleResult> {
  const limit = resolveLimit(options.limit)
  const staleAfterMs = resolveStaleAfterMs(options.staleAfterMs)
  const stageSetId = options.stageSetId ?? DEFAULT_STAGE_SET

  const now = Date.now()
  const staleBefore = new Date(now - staleAfterMs)

  const take = Math.min(limit * 5, 500)

  const baseSelect = Prisma.validator<Prisma.ProductSelect>()({
    id: true,
    slug: true,
    userId: true,
    insightProfile: {
      select: {
        lastRunAt: true,
      },
    },
  })

  const query = Prisma.validator<Prisma.ProductFindManyArgs>()({
    where: {
      status: ProductStatus.published,
      OR: [
        { insightProfile: { is: null } },
        { insightProfile: { is: { lastRunAt: null } } },
        { insightProfile: { is: { lastRunAt: { lt: staleBefore } } } },
      ],
    },
    select: baseSelect,
    orderBy: [{ insightProfile: { lastRunAt: "asc" } }, { createdAt: "asc" }],
    take,
  })

  const candidates = await prisma.product.findMany(query)

  const results: ScheduleResultEntry[] = []
  let queued = 0
  let examined = 0

  for (const product of candidates) {
    if (queued >= limit) break

    examined += 1

    const lastRunAt = product.insightProfile?.lastRunAt
      ? new Date(product.insightProfile.lastRunAt)
      : null

    if (lastRunAt && now - lastRunAt.getTime() < staleAfterMs) {
      results.push({
        productId: product.id,
        productSlug: product.slug,
        status: "skipped",
        reason: "fresh",
      })
      continue
    }

    let access: InsightsPipelineAccessResult | null = null
    try {
      access = await evaluateInsightsPipelineAccess({
        productId: product.id,
        userId: product.userId,
        lastRunAt,
      })
    } catch (error) {
      console.error(
        "[productInsights:autoRun] failed to evaluate pipeline access",
        {
          productId: product.id,
          productSlug: product.slug,
          error,
        },
      )
      results.push({
        productId: product.id,
        productSlug: product.slug,
        status: "skipped",
        reason: "access_error",
      })
      continue
    }

    if (!access.ok) {
      results.push({
        productId: product.id,
        productSlug: product.slug,
        status: "skipped",
        reason: access.reason,
        detail: access,
      })
      continue
    }

    try {
      const enqueueResult = await enqueueProductInsightPipelineJob({
        productId: product.id,
        requestedByUserId: product.userId,
        stageSetId,
      })

      if (enqueueResult.queued) {
        queued += 1
        results.push({
          productId: product.id,
          productSlug: product.slug,
          status: "queued",
        })
        console.info("[productInsights:autoRun] queued stale pipeline", {
          productId: product.id,
          productSlug: product.slug,
          stageSetId,
        })
      } else {
        results.push({
          productId: product.id,
          productSlug: product.slug,
          status: "skipped",
          reason: enqueueResult.reason ?? "unknown",
        })
      }
    } catch (error) {
      console.error(
        "[productInsights:autoRun] failed to enqueue stale pipeline",
        {
          productId: product.id,
          productSlug: product.slug,
          stageSetId,
          error,
        },
      )
      results.push({
        productId: product.id,
        productSlug: product.slug,
        status: "skipped",
        reason: "enqueue_error",
      })
    }
  }

  const skipped = results.filter((entry) => entry.status === "skipped").length

  return {
    examined,
    queued,
    skipped,
    limit,
    staleAfterMs,
    results,
  }
}
