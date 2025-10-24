import { createHash } from "crypto"

/**
 * Deterministically derive the TXT payload we ask owners to publish for DNS verification.
 * Uses a truncated sha256 hash of the normalized website URL to keep the token stable.
 */
export function generateVerificationTxtFromWebsite(websiteUrl: string): string {
  const normalized = websiteUrl.trim().toLowerCase()
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 12)
  return `prod-verif-shipyard-${hash}`
}
