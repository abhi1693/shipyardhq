import { getDomain, getHostname } from "tldts"

/**
 * Return the registrable root domain (apex) for a given URL or hostname.
 * Falls back to the raw hostname if the public suffix parse fails.
 */
export function getRootDomain(
  websiteUrl: string | null | undefined,
): string | null {
  if (!websiteUrl) return null

  const domain = safeGetDomain(websiteUrl)
  if (domain) return domain

  const hostname = safeGetHostname(websiteUrl)
  if (hostname) return hostname

  try {
    const hostname = new URL(websiteUrl).hostname
    return hostname || null
  } catch {
    return null
  }
}

function safeGetDomain(url: string): string | null {
  try {
    return getDomain(url, { allowPrivateDomains: true })
  } catch {
    return null
  }
}

function safeGetHostname(url: string): string | null {
  try {
    return getHostname(url)
  } catch {
    return null
  }
}
