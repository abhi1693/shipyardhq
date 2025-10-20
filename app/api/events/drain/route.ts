import { NextResponse } from "next/server"

import { drainEventQueue } from "@/lib/server/events/drain"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import {
  DEFAULT_EVENT_QUEUE,
  coerceEventQueue,
  type EventQueueName,
} from "@/lib/server/events/queues"

function resolveQueue(request: Request): EventQueueName {
  const url = new URL(request.url)
  const queueParam = url.searchParams.get("queue")
  const resolved = coerceEventQueue(queueParam)
  if (resolved) return resolved
  if (queueParam) {
    console.warn("[events] drain received invalid queue parameter", {
      queueParam,
    })
  }
  return DEFAULT_EVENT_QUEUE
}

async function drainOnce(queue: EventQueueName) {
  const result = await drainEventQueue({ queue })

  if (result.pulled === 0) {
    console.info("[events] drain noop", result)
  } else {
    console.info("[events] drain run", result)
  }

  return result
}

export async function POST(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const queue = resolveQueue(request)

  try {
    const result = await drainOnce(queue)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[events] drain endpoint failed", error)
    return NextResponse.json({ error: "drain_failed" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  const queue = resolveQueue(request)

  try {
    const result = await drainOnce(queue)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[events] drain endpoint failed", error)
    return NextResponse.json({ error: "drain_failed" }, { status: 500 })
  }
}

export const runtime = "nodejs"
