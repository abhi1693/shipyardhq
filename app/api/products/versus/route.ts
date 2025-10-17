import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import { getVersusMatchup } from "@/actions/public/products/versus"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const excludeIds = url.searchParams.getAll("exclude")
  const authResult = await auth()

  const matchup = await getVersusMatchup({
    excludeIds,
    clerkUserId: authResult?.userId,
  })

  if (!matchup.length) {
    return NextResponse.json(
      { matchup: [] },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      },
    )
  }

  return NextResponse.json(
    { matchup },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  )
}
