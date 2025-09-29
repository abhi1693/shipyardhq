import type { RedisClient } from "@/lib/server/redis"
import { getRedisClient } from "@/lib/server/redis"
import type {
  ProductInsightHarvestMode,
  ProductInsightPipelineJobState,
  ProductInsightStageSetId,
} from "@/types/product-insights"
import { PRODUCT_INSIGHT_STAGE_SET_MAP } from "@/lib/server/productInsights/stages"

type RawPipelineJob = {
  productId: string
  requestedByUserId?: string | null
  requestedAt: string
  attempts?: number
  stageSetId?: ProductInsightStageSetId
  discussionsMode?: ProductInsightHarvestMode | null
}

export type PipelineQueueJob = RawPipelineJob & {
  stageSetId: ProductInsightStageSetId
  discussionsMode?: ProductInsightHarvestMode | null
}

function normalizeStageSetId(
  stageSetId?: ProductInsightStageSetId | null,
): ProductInsightStageSetId {
  if (stageSetId && PRODUCT_INSIGHT_STAGE_SET_MAP[stageSetId]) {
    return stageSetId
  }
  return "default"
}

function resolveNamespace(base: string) {
  const prefix =
    process.env.REDIS_ENV_NAMESPACE?.trim() || process.env.NODE_ENV?.trim()
  return prefix ? `${prefix}:${base}` : base
}

const QUEUE_KEY = resolveNamespace("productInsights:pipeline:v1:queue")
const ACTIVE_KEY = resolveNamespace("productInsights:pipeline:v1:active")

export async function enqueueProductInsightPipelineJob(job: {
  productId: string
  requestedByUserId?: string | null
  stageSetId?: ProductInsightStageSetId
  discussionsMode?: ProductInsightHarvestMode | null
}): Promise<{
  queued: boolean
  reason?: "duplicate" | "unavailable" | "error"
}> {
  const client = await getRedisClient()
  if (!client) {
    return { queued: false, reason: "unavailable" }
  }

  try {
    const added = await client.sAdd(ACTIVE_KEY, job.productId)
    if (added === 0) {
      return { queued: false, reason: "duplicate" }
    }

    const payload: RawPipelineJob = {
      productId: job.productId,
      requestedByUserId: job.requestedByUserId ?? null,
      requestedAt: new Date().toISOString(),
      attempts: 0,
      stageSetId: normalizeStageSetId(job.stageSetId ?? null),
      discussionsMode: job.discussionsMode ?? null,
    }

    await client.rPush(QUEUE_KEY, JSON.stringify(payload))
    return { queued: true }
  } catch (error) {
    console.error("[productInsights:pipeline] enqueue failed", {
      productId: job.productId,
      error,
    })
    await client.sRem(ACTIVE_KEY, job.productId).catch(() => undefined)
    return { queued: false, reason: "error" }
  }
}

export async function dequeueProductInsightPipelineJobs(
  limit: number,
): Promise<PipelineQueueJob[]> {
  const client = await getRedisClient()
  if (!client || limit <= 0) return []

  const jobs: PipelineQueueJob[] = []

  for (let index = 0; index < limit; index += 1) {
    const raw = await client.lPop(QUEUE_KEY)
    if (!raw) break
    try {
      const parsed = JSON.parse(raw) as RawPipelineJob
      if (parsed && typeof parsed.productId === "string") {
        jobs.push({
          productId: parsed.productId,
          requestedByUserId: parsed.requestedByUserId ?? null,
          requestedAt: parsed.requestedAt ?? new Date().toISOString(),
          attempts: parsed.attempts ?? 0,
          stageSetId: normalizeStageSetId(parsed.stageSetId ?? null),
          discussionsMode: parsed.discussionsMode ?? null,
        })
      }
    } catch (error) {
      console.warn("[productInsights:pipeline] failed to parse queued job", {
        raw,
        error,
      })
    }
  }

  return jobs
}

export async function markPipelineJobComplete(productId: string) {
  const client = await getRedisClient()
  if (!client) return
  await client.sRem(ACTIVE_KEY, productId).catch((error) => {
    console.warn("[productInsights:pipeline] failed to clear active flag", {
      productId,
      error,
    })
  })
}

export async function requeuePipelineJob(job: PipelineQueueJob) {
  const client = await getRedisClient()
  if (!client) return
  const attempts = (job.attempts ?? 0) + 1
  const payload: RawPipelineJob = {
    productId: job.productId,
    requestedByUserId: job.requestedByUserId ?? null,
    requestedAt: job.requestedAt,
    attempts,
    stageSetId: normalizeStageSetId(job.stageSetId),
    discussionsMode: job.discussionsMode ?? null,
  }
  await client.rPush(QUEUE_KEY, JSON.stringify(payload)).catch((error) => {
    console.error("[productInsights:pipeline] failed to requeue job", {
      productId: job.productId,
      error,
    })
  })
}

async function isPipelineJobQueuedOnClient(
  client: RedisClient,
  productId: string,
): Promise<boolean> {
  try {
    const jobs = await client.lRange(QUEUE_KEY, 0, -1)
    for (const raw of jobs) {
      try {
        const parsed = JSON.parse(raw) as RawPipelineJob | null
        if (parsed?.productId === productId) {
          return true
        }
      } catch (error) {
        console.warn(
          "[productInsights:pipeline] failed to inspect queued job",
          {
            raw,
            error,
          },
        )
      }
    }
    return false
  } catch (error) {
    console.warn("[productInsights:pipeline] failed to inspect queue for job", {
      productId,
      error,
    })
    return false
  }
}

export async function peekPipelineQueueLength(): Promise<number> {
  const client = await getRedisClient()
  if (!client) return 0
  try {
    return await client.lLen(QUEUE_KEY)
  } catch (error) {
    console.warn(
      "[productInsights:pipeline] failed to read queue length",
      error,
    )
    return 0
  }
}

export async function isPipelineJobQueued(productId: string): Promise<boolean> {
  const client = await getRedisClient()
  if (!client) return false
  return isPipelineJobQueuedOnClient(client, productId)
}

export async function getPipelineJobState(
  productId: string,
): Promise<ProductInsightPipelineJobState> {
  const client = await getRedisClient()
  if (!client) return "idle"

  try {
    const isActive = await client.sIsMember(ACTIVE_KEY, productId)
    if (isActive) {
      return "active"
    }
  } catch (error) {
    console.warn("[productInsights:pipeline] failed to inspect active jobs", {
      productId,
      error,
    })
  }

  const queued = await isPipelineJobQueuedOnClient(client, productId)
  return queued ? "queued" : "idle"
}
