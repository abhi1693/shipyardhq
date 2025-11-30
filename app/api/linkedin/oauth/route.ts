import { NextRequest, NextResponse } from "next/server"

import {
  buildLinkedInRedirectUri,
  exchangeLinkedInAuthCode,
  getLinkedInAuthStatus,
  createLinkedInStateToken,
} from "@/lib/server/social/linkedinAuth"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const redirectUri = buildLinkedInRedirectUri(request.nextUrl.origin)

  if (!code) {
    try {
      const issuedState = await createLinkedInStateToken()
      const status = await getLinkedInAuthStatus({
        baseUrl: request.nextUrl.origin,
        state: issuedState,
      })
      console.info("[linkedin] OAuth status requested", {
        ...status,
        state: issuedState,
      })
      return new NextResponse(null, {
        status: 204,
        headers: { "cache-control": "no-store" },
      })
    } catch (error) {
      console.error("[linkedin] failed to prepare OAuth state", error)
      return new NextResponse(null, { status: 500 })
    }
  }

  if (!state) {
    console.warn("[linkedin] missing state on OAuth callback")
    return new NextResponse(null, { status: 401 })
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
    console.info("[linkedin] OAuth exchange completed", {
      expiresIn: exchangeResult.expiresIn,
      hasAccessToken: status.hasAccessToken,
      hasOrgUrn: status.hasOrgUrn,
      redirectUri: status.redirectUri,
      state,
    })
    return new NextResponse(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    console.error("[linkedin] oauth exchange failed", error)
    return new NextResponse(null, { status: 400 })
  }
}
