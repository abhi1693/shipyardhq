import { NextResponse } from "next/server"

import {
  dequeueProductIdeaPipelineJobs,
  markPipelineJobComplete,
  requeuePipelineJob,
} from "@/lib/server/productIdeas/pipelineQueue"
import { runProductIdeaPipeline } from "@/lib/server/productIdeas/pipelineRunner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_BATCH_SIZE = 3
const DEFAULT_MAX_ATTEMPTS = 3

function getBatchSize() {
  const raw = process.env.PRODUCT_IDEA_PIPELINE_BATCH?.trim()
  const value = raw ? Number.parseInt(raw, 10) : DEFAULT_BATCH_SIZE
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BATCH_SIZE
}

function getMaxAttempts() {
  const raw = process.env.PRODUCT_IDEA_PIPELINE_MAX_ATTEMPTS?.trim()
  const value = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_ATTEMPTS
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_ATTEMPTS
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization") || ""
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const batchSize = getBatchSize()
  const maxAttempts = getMaxAttempts()

  try {
    const jobs = await dequeueProductIdeaPipelineJobs(batchSize)
    if (!jobs.length) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    const results: Array<Record<string, unknown>> = []

    for (const job of jobs) {
      try {
        await runProductIdeaPipeline({
          productId: job.productId,
          requestedByUserId: job.requestedByUserId ?? null,
        })

        await markPipelineJobComplete(job.productId)
        results.push({
          productId: job.productId,
          status: "completed",
          attempts: job.attempts ?? 0,
        })
      } catch (error) {
        const attempts = (job.attempts ?? 0) + 1
        const message =
          error instanceof Error ? error.message : "Pipeline execution failed"

        if (attempts >= maxAttempts) {
          await markPipelineJobComplete(job.productId)
          console.error("[productIdeas:pipeline] job permanently failed", {
            productId: job.productId,
            attempts,
            error,
          })
          results.push({
            productId: job.productId,
            status: "failed",
            attempts,
            error: message,
          })
        } else {
          console.warn("[productIdeas:pipeline] job failed; requeueing", {
            productId: job.productId,
            attempts,
            error,
          })
          await requeuePipelineJob(job)
          results.push({
            productId: job.productId,
            status: "requeued",
            attempts,
            error: message,
          })
        }
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length, results })
  } catch (error: any) {
    console.error("[cron] product idea pipeline failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
