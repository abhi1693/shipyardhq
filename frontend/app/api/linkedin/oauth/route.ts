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
    return new NextResponse(
      "<h1>LinkedIn OAuth failed</h1><p>State is missing from the callback.</p>",
      {
        status: 401,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
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
    console.info("[linkedin] OAuth exchange completed", {
      expiresIn: exchangeResult.expiresIn,
      hasAccessToken: status.hasAccessToken,
      hasOrgUrn: status.hasOrgUrn,
      redirectUri: status.redirectUri,
      state,
    })
    const successHtml = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>LinkedIn OAuth Success</title>
          <style>
            body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; text-align: center; margin: 3rem auto; max-width: 640px; padding: 0 1.5rem; }
            h1 { margin-bottom: 0.5rem; }
            p { color: #444; }
            code { background: #f4f4f4; padding: 0.25rem 0.4rem; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>LinkedIn OAuth completed</h1>
          <p>You're all set. The Shipyard HQ LinkedIn integration now has an access token.</p>
          <p>If this tab was opened automatically, you can close it and return to the app.</p>
        </body>
      </html>`

    return new NextResponse(successHtml, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("[linkedin] oauth exchange failed", error)
    return new NextResponse(
      "<h1>LinkedIn OAuth failed</h1><p>We could not exchange the authorization code. Please try again.</p>",
      {
        status: 400,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    )
  }
}
