import { NextResponse } from "next/server"

import { dequeueEnvelopeBatch, requeueEnvelope } from "@/lib/server/events/queueClient"
import { processEnvelope } from "@/lib/server/events/worker"

const BATCH_SIZE = 25

async function drainOnce() {
  const startedAt = Date.now()
  const envelopeIds = await dequeueEnvelopeBatch(BATCH_SIZE)
  let processed = 0
  let failed = 0

  for (const id of envelopeIds) {
    try {
      await processEnvelope(id)
      processed += 1
    } catch (error) {
      failed += 1
      console.error("[events] drain failure", { envelopeId: id, error })
      await requeueEnvelope(id)
    }
  }

  const durationMs = Date.now() - startedAt
  const result = { processed, failed, pulled: envelopeIds.length, durationMs }

  if (result.pulled === 0) {
    console.info("[events] drain noop", result)
  } else {
    console.info("[events] drain run", result)
  }

  return result
}

export async function POST() {
  try {
    const result = await drainOnce()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[events] drain endpoint failed", error)
    return NextResponse.json({ error: "drain_failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await drainOnce()
    return NextResponse.json(result)
  } catch (error) {
    console.error("[events] drain endpoint failed", error)
    return NextResponse.json({ error: "drain_failed" }, { status: 500 })
  }
}

export const runtime = "nodejs"
