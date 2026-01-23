export function parseKeywords(text?: string): string[] {
  if (!text) return []
  const set = new Set(
    text
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  )
  return Array.from(set)
}

export function uppercaseCurrency(code?: string | null): string | undefined {
  return code ? code.toUpperCase() : undefined
}

export function sanitizeTextFields<T extends Record<string, any>>(
  values: T,
): T {
  const clone: any = { ...values }
  for (const k of ["name", "tagline", "websiteUrl", "logo"]) {
    if (typeof clone[k] === "string") clone[k] = clone[k].trim()
  }
  if (typeof clone.websiteUrl === "string") {
    clone.websiteUrl = cleanWebsiteUrlInput(clone.websiteUrl)
  }
  return clone
}

export function cleanWebsiteUrlInput(raw?: string | null): string {
  const value = (raw ?? "").trim()
  if (!value) return ""

  const hasProtocol = /^https?:\/\//i.test(value)
  const isProtocolRelative = /^\/\//.test(value)

  let candidate = value
  if (isProtocolRelative) {
    candidate = `https:${candidate}`
  } else if (!hasProtocol) {
    candidate = candidate.replace(/^\/+/g, "")
    candidate = `https://${candidate}`
  }

  try {
    const url = new URL(candidate)
    const isRootPath = !url.pathname || url.pathname === "/"
    const hasQueryOrHash = Boolean(url.search || url.hash)
    if (isRootPath && !hasQueryOrHash) {
      return url.origin
    }
    return `${url.origin}${url.pathname}${url.search}${url.hash}`
  } catch {
    return candidate.replace(/\/+$/g, "")
  }
}

export function normalizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const s = url.trim()
  if (!s) return undefined
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

export function coercePricing<T extends Record<string, any>>(values: T): T {
  const v: T = { ...values }
  const pm = (v as any).pricingModel
  if (pm === "free" || pm === "custom") {
    ;(v as any).startingPriceCents = undefined
    ;(v as any).currencyCode = undefined
  }
  return v
}
