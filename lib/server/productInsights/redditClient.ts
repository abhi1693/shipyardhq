const REDDIT_USER_AGENT =
  process.env.REDDIT_USER_AGENT?.trim() ||
  "ShipyardHQ-ProductInsights/1.0 (https://shipyardhq.dev)"

let cachedAccessToken: {
  token: string
  expiresAt: number
} | null = null

export function getRedditUserAgent() {
  return REDDIT_USER_AGENT
}

export async function getRedditAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
    return cachedAccessToken.token
  }

  const clientId = process.env.REDDIT_CLIENT_ID?.trim()
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error(
      "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be configured to query Reddit",
    )
  }

  console.info("[productInsights:reddit] requesting reddit access token")
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  )
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": REDDIT_USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(
      `Failed to obtain Reddit access token (status ${response.status}): ${errorBody}`,
    )
  }

  const json = (await response.json()) as {
    access_token?: string
    token_type?: string
    expires_in?: number
    error?: string
  }

  if (json.error) {
    throw new Error(`Reddit token error: ${json.error}`)
  }

  if (!json.access_token || json.token_type?.toLowerCase() !== "bearer") {
    throw new Error("Invalid response when requesting Reddit access token")
  }

  const expiresInMs = (json.expires_in ?? 3600) * 1000
  cachedAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + expiresInMs,
  }

  return json.access_token
}
