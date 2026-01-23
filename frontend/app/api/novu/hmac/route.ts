import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import {
  generateNovuSubscriberHash,
  isNovuEnabled,
} from "@/lib/server/notifications/novu"

export const dynamic = "force-dynamic"

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isNovuEnabled()) {
    return NextResponse.json(
      { error: "Novu is not configured" },
      { status: 503 },
    )
  }

  try {
    const hash = generateNovuSubscriberHash(userId)
    return NextResponse.json({ hash })
  } catch (error) {
    console.error("Failed to generate Novu subscriber hash", error)
    return NextResponse.json(
      { error: "Failed to generate subscriber hash" },
      { status: 500 },
    )
  }
}
