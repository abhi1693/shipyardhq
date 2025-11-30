import { NextRequest, NextResponse } from "next/server"

import {
  buildLinkedInRedirectUri,
  exchangeLinkedInAuthCode,
  getLinkedInAuthStatus,
} from "@/lib/server/social/linkedinAuth"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const redirectUri = buildLinkedInRedirectUri(request.nextUrl.origin)

  if (!code) {
    const status = await getLinkedInAuthStatus({
      baseUrl: request.nextUrl.origin,
    })
    return NextResponse.json(
      { ok: true, ...status },
      { status: 200, headers: { "cache-control": "no-store" } },
    )
  }

  try {
    const exchangeResult = await exchangeLinkedInAuthCode({
      code,
      redirectUri,
      state,
    })
    const status = await getLinkedInAuthStatus({
      baseUrl: request.nextUrl.origin,
    })
    return NextResponse.json(
      {
        ok: true,
        exchanged: true,
        expiresIn: exchangeResult.expiresIn,
        ...status,
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    )
  } catch (error) {
    console.error("[linkedin] oauth exchange failed", error)
    return NextResponse.json(
      {
        ok: false,
        exchanged: false,
        error: error instanceof Error ? error.message : "LinkedIn OAuth failed",
      },
      { status: 400 },
    )
  }
}
