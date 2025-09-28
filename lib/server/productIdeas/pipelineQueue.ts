import type { RedisClient } from "@/lib/server/redis"
import { getRedisClient } from "@/lib/server/redis"
import type { ProductIdeaPipelineJobState } from "@/types/product-ideas"

type RawPipelineJob = {
  productId: string
  requestedByUserId?: string | null
  requestedAt: string
  attempts?: number
}

export type PipelineQueueJob = RawPipelineJob

function resolveNamespace(base: string) {
  const prefix =
    process.env.REDIS_ENV_NAMESPACE?.trim() || process.env.NODE_ENV?.trim()
  return prefix ? `${prefix}:${base}` : base
}

const QUEUE_KEY = resolveNamespace("productIdeas:pipeline:v1:queue")
const ACTIVE_KEY = resolveNamespace("productIdeas:pipeline:v1:active")

export async function enqueueProductIdeaPipelineJob(job: {
  productId: string
  requestedByUserId?: string | null
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
    }

    await client.rPush(QUEUE_KEY, JSON.stringify(payload))
    return { queued: true }
  } catch (error) {
    console.error("[productIdeas:pipeline] enqueue failed", {
      productId: job.productId,
      error,
    })
    await client.sRem(ACTIVE_KEY, job.productId).catch(() => undefined)
    return { queued: false, reason: "error" }
  }
}

export async function dequeueProductIdeaPipelineJobs(
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
        })
      }
    } catch (error) {
      console.warn("[productIdeas:pipeline] failed to parse queued job", {
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
    console.warn("[productIdeas:pipeline] failed to clear active flag", {
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
  }
  await client.rPush(QUEUE_KEY, JSON.stringify(payload)).catch((error) => {
    console.error("[productIdeas:pipeline] failed to requeue job", {
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
        console.warn("[productIdeas:pipeline] failed to inspect queued job", {
          raw,
          error,
        })
      }
    }
    return false
  } catch (error) {
    console.warn("[productIdeas:pipeline] failed to inspect queue for job", {
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
    console.warn("[productIdeas:pipeline] failed to read queue length", error)
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
): Promise<ProductIdeaPipelineJobState> {
  const client = await getRedisClient()
  if (!client) return "idle"

  try {
    const isActive = await client.sIsMember(ACTIVE_KEY, productId)
    if (isActive) {
      return "active"
    }
  } catch (error) {
    console.warn("[productIdeas:pipeline] failed to inspect active jobs", {
      productId,
      error,
    })
  }

  const queued = await isPipelineJobQueuedOnClient(client, productId)
  return queued ? "queued" : "idle"
}
