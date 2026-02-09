import { NextResponse } from "next/server"

import { dodoClient } from "@/lib/dodo"

const WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET?.trim()

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[dodo-webhook] missing DODO_WEBHOOK_SECRET")
    return NextResponse.json(
      { error: "webhook secret missing" },
      { status: 400 },
    )
  }

  const rawBody = await req.text()
  console.info("[dodo-webhook] received", rawBody)

  let event:
    | Awaited<ReturnType<typeof dodoClient.webhooks.unwrap>>
    | Awaited<ReturnType<typeof dodoClient.webhooks.unsafeUnwrap>>

  try {
    event = await dodoClient.webhooks.unwrap(rawBody, {
      headers: Object.fromEntries(req.headers),
      key: WEBHOOK_SECRET,
    })
  } catch (error) {
    console.error("[dodo-webhook] failed to unwrap", error)
    return NextResponse.json({ error: "invalid webhook" }, { status: 400 })
  }

  console.info("[dodo-webhook] ignored event", event.type)

  return NextResponse.json({ ok: true })
}
