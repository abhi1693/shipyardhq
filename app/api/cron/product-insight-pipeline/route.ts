import { NextResponse } from "next/server"

import {
  dequeueProductInsightPipelineJobs,
  markPipelineJobComplete,
  requeuePipelineJob,
} from "@/lib/server/productInsights/pipelineQueue"
import { runProductInsightPipeline } from "@/lib/server/productInsights/pipelineRunner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_BATCH_SIZE = 3
const DEFAULT_MAX_ATTEMPTS = 3

function getBatchSize() {
  const raw =
    process.env.PRODUCT_INSIGHT_PIPELINE_BATCH?.trim() ??
    process.env.PRODUCT_IDEA_PIPELINE_BATCH?.trim()
  const value = raw ? Number.parseInt(raw, 10) : DEFAULT_BATCH_SIZE
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BATCH_SIZE
}

function getMaxAttempts() {
  const raw =
    process.env.PRODUCT_INSIGHT_PIPELINE_MAX_ATTEMPTS?.trim() ??
    process.env.PRODUCT_IDEA_PIPELINE_MAX_ATTEMPTS?.trim()
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
    const jobs = await dequeueProductInsightPipelineJobs(batchSize)
    if (!jobs.length) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    const results: Array<Record<string, unknown>> = []

    for (const job of jobs) {
      try {
        await runProductInsightPipeline({
          productId: job.productId,
          requestedByUserId: job.requestedByUserId ?? null,
          stageSetId: job.stageSetId,
          discussionsMode: job.discussionsMode ?? undefined,
        })

        await markPipelineJobComplete(job.productId)
        results.push({
          productId: job.productId,
          status: "completed",
          attempts: job.attempts ?? 0,
          stageSetId: job.stageSetId,
        })
      } catch (error) {
        const attempts = (job.attempts ?? 0) + 1
        const message =
          error instanceof Error ? error.message : "Pipeline execution failed"

        if (attempts >= maxAttempts) {
          await markPipelineJobComplete(job.productId)
          console.error("[productInsights:pipeline] job permanently failed", {
            productId: job.productId,
            attempts,
            error,
            stageSetId: job.stageSetId,
          })
          results.push({
            productId: job.productId,
            status: "failed",
            attempts,
            error: message,
            stageSetId: job.stageSetId,
          })
        } else {
          console.warn("[productInsights:pipeline] job failed; requeueing", {
            productId: job.productId,
            attempts,
            error,
            stageSetId: job.stageSetId,
          })
          await requeuePipelineJob(job)
          results.push({
            productId: job.productId,
            status: "requeued",
            attempts,
            error: message,
            stageSetId: job.stageSetId,
          })
        }
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length, results })
  } catch (error: any) {
    console.error("[cron] product insight pipeline failed", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 },
    )
  }
}
