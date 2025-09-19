import { createHmac } from "crypto"

import type { DeviceCategory } from "@/types/analytics"

const TABLET_REGEX =
  /(?:ipad|tablet|nexus (?:7|9|10)|sm-t\d+|kindle|silk|playbook)/i
const MOBILE_REGEX = /(?:mobile|iphone|ipod|android.*mobile|blackberry|phone)/i

function parseBrandFromHint(brandHint?: string | null) {
  if (!brandHint) return null
  const cleaned = brandHint
    .split(",")
    .map((token) => token.trim())
    .map((token) => token.split(";")[0])
    .map((token) => token.replace(/"/g, ""))
    .filter((token) => token && !token.includes("Not"))
  return cleaned[0] ?? null
}

function normalizeTrimmed(value?: string | null, max = 512) {
  if (!value) return null
  return value.substring(0, max)
}

export function inferDeviceCategory(
  userAgent?: string | null,
  mobileHint?: string | null,
): DeviceCategory {
  if (mobileHint && mobileHint.includes("?1")) {
    return "mobile"
  }

  if (!userAgent) return "unknown"
  if (TABLET_REGEX.test(userAgent)) return "tablet"
  if (MOBILE_REGEX.test(userAgent)) return "mobile"
  return "desktop"
}

export function parseBrowser(
  userAgent?: string | null,
  brandHint?: string | null,
): string | null {
  const hinted = parseBrandFromHint(brandHint)
  if (hinted) return hinted

  if (!userAgent) return null
  const ua = userAgent.toLowerCase()

  if (ua.includes("edg") || ua.includes("edge")) return "Edge"
  if (ua.includes("opr") || ua.includes("opera")) return "Opera"
  if (ua.includes("chrome") && !ua.includes("edg") && !ua.includes("opr"))
    return "Chrome"
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari"
  if (ua.includes("firefox") || ua.includes("fxios")) return "Firefox"
  if (ua.includes("msie") || ua.includes("trident")) return "Internet Explorer"

  return null
}

export function parseOs(
  userAgent?: string | null,
  platformHint?: string | null,
) {
  if (platformHint && platformHint !== '"Not_A Brand"') {
    return platformHint.replace(/"/g, "")
  }

  if (!userAgent) return null
  const ua = userAgent.toLowerCase()

  if (ua.includes("windows nt")) return "Windows"
  if (ua.includes("android")) return "Android"
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
    return "iOS"
  if (ua.includes("mac os x")) return "macOS"
  if (ua.includes("linux")) return "Linux"

  return null
}

export function hashIpAddress(
  ip?: string | null,
  secret = process.env.ANALYTICS_HASH_SALT || "shipyard-analytics",
) {
  if (!ip) return null
  try {
    return createHmac("sha256", secret).update(ip).digest("hex")
  } catch (err) {
    console.error("[analytics] failed to hash ip", err)
    return null
  }
}

export function sanitizeReferrer(referrer?: string | null) {
  return normalizeTrimmed(referrer, 1024)
}

export function sanitizePath(path?: string | null) {
  return normalizeTrimmed(path, 1024)
}
