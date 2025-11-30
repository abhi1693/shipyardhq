import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { getAppBaseUrl } from "@/lib/email/utils"

const ACCESS_TOKEN_CACHE_KEY = buildCacheKey("linkedin", "access_token")
const DEFAULT_TOKEN_TTL_SECONDS = 55 * 24 * 60 * 60 // ~55 days
const COMPANY_PAGE_URL = "https://www.linkedin.com/company/shipyard-hq/"

type TokenExchangeResult = {
  accessToken: string
  expiresIn: number | null
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

function getLinkedInSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return null
  return secret
}

export function buildLinkedInRedirectUri(baseOverride?: string): string {
  const envRedirect = process.env.LINKEDIN_REDIRECT_URI?.trim()
  if (envRedirect) return envRedirect

  const base = (baseOverride ?? getAppBaseUrl()).replace(/\/$/, "")
  return `${base}/api/linkedin/oauth`
}

export function buildLinkedInAuthUrl(redirectUri: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const state = getLinkedInSecret()
  const scopes = [
    "w_organization_social",
    "r_organization_social",
    "openid",
    "profile",
  ]

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
  url.searchParams.set("response_type", "code")
  if (clientId) url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", scopes.join(" "))
  if (state) url.searchParams.set("state", state)

  return url.toString()
}

async function storeAccessToken(
  accessToken: string,
  expiresIn: number | null,
): Promise<void> {
  const client = await getRedisClient()
  if (!client) return

  const ttlSeconds =
    typeof expiresIn === "number" && expiresIn > 0
      ? expiresIn
      : DEFAULT_TOKEN_TTL_SECONDS

  try {
    await client.set(ACCESS_TOKEN_CACHE_KEY, accessToken, {
      EX: ttlSeconds,
    })
  } catch (error) {
    console.error("[linkedin] failed to store access token", { error })
  }
}

export async function getLinkedInAccessToken(): Promise<string | null> {
  const client = await getRedisClient()
  if (client) {
    try {
      const cached = await client.get(ACCESS_TOKEN_CACHE_KEY)
      if (cached) {
        return cached
      }
    } catch (error) {
      console.error("[linkedin] failed to read token from redis", { error })
    }
  }
  return null
}

function parseTokenResponse(payload: unknown): TokenExchangeResult | null {
  const data = payload as Record<string, any>
  const token =
    typeof data?.access_token === "string" && data.access_token.trim().length
      ? data.access_token.trim()
      : null
  if (!token) {
    return null
  }

  const expiresInRaw = data?.expires_in
  const expiresIn =
    typeof expiresInRaw === "number" && expiresInRaw > 0 ? expiresInRaw : null

  return { accessToken: token, expiresIn }
}

let cachedOrgUrn: string | null | undefined

export async function resolveOrganizationUrn(): Promise<string | null> {
  if (cachedOrgUrn !== undefined) return cachedOrgUrn

  try {
    const response = await fetch(COMPANY_PAGE_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      console.warn(
        `[linkedin] failed to fetch company page (status ${response.status})`,
      )
      cachedOrgUrn = null
      return null
    }

    const html = await response.text()
    const patterns: Array<RegExp> = [
      /urn:li:organization:(\d{4,20})/i,
      /urn:li:fsd_company:(\d{4,20})/i,
      /"companyId"\s*:\s*"?(\\d{4,20})"?/,
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        cachedOrgUrn = `urn:li:organization:${match[1]}`
        return cachedOrgUrn
      }
    }

    console.warn("[linkedin] could not extract organization id from page HTML")
    cachedOrgUrn = null
    return null
  } catch (error) {
    console.warn("[linkedin] failed to resolve organization urn", { error })
    cachedOrgUrn = null
    return null
  }
}

export async function exchangeLinkedInAuthCode(params: {
  code: string
  redirectUri: string
  state?: string | null
}): Promise<TokenExchangeResult> {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const secret = getLinkedInSecret()

  if (!clientId || !clientSecret) {
    throw new Error("Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET")
  }

  if (!secret) {
    throw new Error("Missing CRON_SECRET for LinkedIn OAuth")
  }

  if (!params.state || params.state !== secret) {
    throw new Error("Invalid LinkedIn OAuth state")
  }

  const payload = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  })

  const json = await response.json().catch(() => null)
  const parsed = parseTokenResponse(json)

  if (!response.ok || !parsed) {
    const detail =
      typeof json?.error_description === "string"
        ? json.error_description
        : typeof json?.error === "string"
          ? json.error
          : "unknown error"
    throw new Error(
      `[linkedin] token exchange failed (${response.status}): ${detail}`,
    )
  }

  await storeAccessToken(parsed.accessToken, parsed.expiresIn)

  return parsed
}

export async function getLinkedInAuthStatus(options?: {
  baseUrl?: string
}) {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const orgUrn = await resolveOrganizationUrn()
  const redirectUri = buildLinkedInRedirectUri(options?.baseUrl)
  const dryRun = parseBoolean(process.env.LINKEDIN_BOT_DRY_RUN)
  const token = await getLinkedInAccessToken()
  const secretPresent = Boolean(getLinkedInSecret())

  return {
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasOrgUrn: Boolean(orgUrn),
    hasAccessToken: Boolean(token),
    hasCronSecret: secretPresent,
    dryRun,
    redirectUri,
    authUrl: buildLinkedInAuthUrl(redirectUri),
  }
}
