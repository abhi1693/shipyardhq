import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"
import { ensureCronAuthorized } from "@/lib/server/cronAuth"

function dayKey(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

export async function POST(request: Request) {
  const unauthorized = ensureCronAuthorized(request)
  if (unauthorized) return unauthorized

  const today = dayKey(new Date())

  await prisma.pageTrafficDaily.upsert({
    where: { date: today },
    create: { date: today, pageViews: 1, visitors: 1 },
    update: {
      pageViews: { increment: 1 },
      visitors: { increment: 1 },
    },
  })

  return NextResponse.json({ ok: true }, { status: 202 })
}
