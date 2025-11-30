import crypto from "crypto"

import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"
import { getAppBaseUrl } from "@/lib/email/utils"

const ACCESS_TOKEN_CACHE_KEY = buildCacheKey("linkedin", "access_token")
const DEFAULT_TOKEN_TTL_SECONDS = 55 * 24 * 60 * 60 // ~55 days
const DEFAULT_COMPANY_PAGE_URL =
  "https://www.linkedin.com/company/shipyard-hq/"
const COMPANY_PAGE_URL =
  process.env.LINKEDIN_COMPANY_PAGE_URL?.trim() || DEFAULT_COMPANY_PAGE_URL
const CONFIGURED_ORGANIZATION_URN =
  process.env.LINKEDIN_ORGANIZATION_URN?.trim() || null
const OAUTH_STATE_TTL_SECONDS = 10 * 60
const STATE_SEPARATOR = "."
const MIN_SIGNING_KEY_LENGTH = 16
const STATE_REPLAY_FALLBACK: Map<string, number> = new Map()

type TokenExchangeResult = {
  accessToken: string
  expiresIn: number | null
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

export function buildLinkedInRedirectUri(baseOverride?: string): string {
  const envRedirect = process.env.LINKEDIN_REDIRECT_URI?.trim()
  if (envRedirect) return envRedirect

  const base = (baseOverride ?? getAppBaseUrl()).replace(/\/$/, "")
  return `${base}/api/linkedin/oauth`
}

function getStateSigningKey(): string | null {
  const secret =
    process.env.LINKEDIN_STATE_SECRET?.trim() ||
    process.env.LINKEDIN_CLIENT_SECRET?.trim() ||
    null
  return secret && secret.length >= MIN_SIGNING_KEY_LENGTH ? secret : null
}

function generateStateToken(): string {
  return crypto.randomBytes(16).toString("hex")
}

export async function createLinkedInStateToken(): Promise<string> {
  const signingKey = getStateSigningKey()
  if (!signingKey) {
    throw new Error(
      "Missing LINKEDIN_STATE_SECRET or LINKEDIN_CLIENT_SECRET for state signing",
    )
  }

  const nonce = generateStateToken()
  const issuedAtSeconds = Math.floor(Date.now() / 1000)
  const payload = `${nonce}${STATE_SEPARATOR}${issuedAtSeconds}`
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(payload)
    .digest("hex")

  return `${payload}${STATE_SEPARATOR}${signature}`
}

export async function consumeLinkedInStateToken(
  state: string | null | undefined,
): Promise<boolean> {
  if (!state) return false
  const trimmed = state.trim()
  if (!trimmed) return false

  const signingKey = getStateSigningKey()
  if (!signingKey) {
    console.error("[linkedin] missing signing key for oauth state validation")
    return false
  }

  const parts = trimmed.split(STATE_SEPARATOR)
  if (parts.length !== 3) return false

  const [nonce, issuedAtStr, providedSignature] = parts
  if (!nonce || !issuedAtStr || !providedSignature) return false

  const issuedAtSeconds = Number.parseInt(issuedAtStr, 10)
  if (!Number.isFinite(issuedAtSeconds)) return false

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (issuedAtSeconds + OAUTH_STATE_TTL_SECONDS < nowSeconds) {
    return false
  }

  const payload = `${nonce}${STATE_SEPARATOR}${issuedAtStr}`
  const expectedSignature = crypto
    .createHmac("sha256", signingKey)
    .update(payload)
    .digest("hex")

  if (providedSignature.length !== expectedSignature.length) {
    return false
  }

  const signaturesMatch = crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature),
  )

  if (!signaturesMatch) {
    return false
  }

  const ttlSeconds = Math.max(
    issuedAtSeconds + OAUTH_STATE_TTL_SECONDS - nowSeconds,
    1,
  )

  // Replay protection with Redis; fall back to in-process memory when Redis
  // isn't available (e.g., local dev without Redis configured).
  const replayKey = buildCacheKey("linkedin", "state-replay", nonce)
  const redis = await getRedisClient().catch(() => null)
  if (redis) {
    try {
      const setResult = await redis.set(replayKey, "1", {
        EX: ttlSeconds,
        NX: true,
      })
      if (setResult === null) {
        return false
      }
      return true
    } catch (error) {
      console.warn("[linkedin] failed to store oauth state replay key", {
        error,
      })
    }
  }

  const existing = STATE_REPLAY_FALLBACK.get(replayKey)
  if (existing && existing > nowSeconds) {
    return false
  }
  STATE_REPLAY_FALLBACK.set(replayKey, nowSeconds + ttlSeconds)
  return true
}

export function buildLinkedInAuthUrl(params: {
  redirectUri: string
  state: string
}): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const scopes = [
    "w_organization_social",
    "r_organization_social",
    "openid",
    "profile",
  ]

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
  url.searchParams.set("response_type", "code")
  if (clientId) url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("scope", scopes.join(" "))
  url.searchParams.set("state", params.state)

  return url.toString()
}

export async function buildLinkedInAuthRequest(baseOverride?: string) {
  const redirectUri = buildLinkedInRedirectUri(baseOverride)
  const state = await createLinkedInStateToken()
  const authUrl = buildLinkedInAuthUrl({ redirectUri, state })
  return { authUrl }
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
  if (CONFIGURED_ORGANIZATION_URN) {
    return CONFIGURED_ORGANIZATION_URN
  }

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
    return null
  } catch (error) {
    console.warn("[linkedin] failed to resolve organization urn", { error })
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

  if (!clientId || !clientSecret) {
    throw new Error("Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET")
  }

  const stateIsValid = await consumeLinkedInStateToken(params.state)
  if (!stateIsValid) {
    throw new Error("Invalid or expired LinkedIn OAuth state")
  }

  const payload = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    },
  )

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
  state?: string | null
}) {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const orgUrn = await resolveOrganizationUrn()
  const redirectUri = buildLinkedInRedirectUri(options?.baseUrl)
  const dryRun = parseBoolean(process.env.LINKEDIN_BOT_DRY_RUN)
  const token = await getLinkedInAccessToken()
  const authUrl = options?.state
    ? buildLinkedInAuthUrl({ redirectUri, state: options.state })
    : null

  return {
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasOrgUrn: Boolean(orgUrn),
    hasAccessToken: Boolean(token),
    dryRun,
    redirectUri,
    authUrl,
  }
}
