import { BetaAnalyticsDataClient } from "@google-analytics/data"

export type Ga4ClientConfig = {
  propertyId: string
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

/**
 * Creates a GA4 Data API client using a service account.
 *
 * Secrets policy:
 * - Do NOT commit credentials.
 * - Provide credentials via env var GA4_SERVICE_ACCOUNT_JSON (raw JSON) or
 *   SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64 (preferred) or GA4_SERVICE_ACCOUNT_JSON_BASE64 (base64 encoded JSON).
 */
export function createGa4DataApiClient(): BetaAnalyticsDataClient {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON
  const b64 = process.env.SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64 ?? process.env.GA4_SERVICE_ACCOUNT_JSON_BASE64

  let credentialsJson: string
  if (raw) credentialsJson = raw
  else if (b64) credentialsJson = Buffer.from(b64, "base64").toString("utf8")
  else {
    throw new Error(
      "Missing GA4 service account credentials. Set GA4_SERVICE_ACCOUNT_JSON or SHIPYARD_GA4_SERVICE_ACCOUNT_JSON_BASE64 (preferred) or GA4_SERVICE_ACCOUNT_JSON_BASE64.",
    )
  }

  const credentials = JSON.parse(credentialsJson) as {
    client_email: string
    private_key: string
  }

  return new BetaAnalyticsDataClient({ credentials })
}

export function getGa4PropertyId(cfg?: Partial<Ga4ClientConfig>): string {
  return cfg?.propertyId ?? requireEnv("GA4_PROPERTY_ID")
}
