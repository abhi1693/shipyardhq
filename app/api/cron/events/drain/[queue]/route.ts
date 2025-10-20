import { NextResponse } from "next/server"

import { ensureCronAuthorized } from "@/lib/server/cronAuth"
import { drainEventQueue } from "@/lib/server/events/drain"
import {
  assertEventQueue,
  getEventQueueDefinition,
  type EventQueueName,
} from "@/lib/server/events/queues"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function resolveQueueFromParams(
  params?: Promise<{ queue?: string }>,
): Promise<EventQueueName> {
  const resolved = params ? await params : undefined
  const rawQueue = resolved?.queue ?? ""
  return assertEventQueue(rawQueue)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ queue?: string }> },
) {
  const authResponse = ensureCronAuthorized(request)
  if (authResponse) return authResponse

  let queue: EventQueueName
  try {
    queue = await resolveQueueFromParams(params)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid queue identifier"
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    )
  }

  const { label } = getEventQueueDefinition(queue)

  try {
    console.info(`[cron.events-drain.${queue}] ${label} run started`)
    const result = await drainEventQueue({ queue })
    console.info(`[cron.events-drain.${queue}] run completed`, result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error(`[cron.events-drain.${queue}] run failed`, error)
    const message = error instanceof Error ? error.message : "Failed"
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
