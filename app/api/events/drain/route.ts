import { NextResponse } from "next/server"

import { drainEventQueue } from "@/lib/server/events/drain"

async function drainOnce() {
  const result = await drainEventQueue()

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
