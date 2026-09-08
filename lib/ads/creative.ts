import { CARBON_PLACEMENT, CARBON_ZONE } from "@/lib/ads/config"

export type CarbonVisual =
  | { kind: "rich"; largeImage: string; logo: string; tagline: string }
  | { kind: "image-text"; smallImage: string }
  | { kind: "native-icon"; image: string }
  | { kind: "logo-text"; logo: string }
  | { kind: "text" }

export type CarbonCreative = {
  visual: CarbonVisual
  link: string
  description: string
  company: string
  callToAction: string
  backgroundColor?: string
  pixels: string[]
  viewUrl?: string
}

function text(value: unknown) {
  if (typeof value !== "string") return ""
  const element = document.createElement("textarea")
  element.innerHTML = value
  return element.value
}

function adUrl(value: unknown, timestamp: string) {
  if (typeof value !== "string" || !value.trim()) return undefined
  try {
    const url = new URL(
      text(value)
        .replaceAll("[timestamp]", timestamp)
        .replaceAll("[placement]", CARBON_PLACEMENT),
      "https://srv.buysellads.com",
    )
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined
    url.protocol = "https:"
    return url.toString()
  } catch {
    return undefined
  }
}

export function parseCarbonCreative(response: unknown): CarbonCreative | null {
  if (!response || typeof response !== "object" || !("ads" in response))
    return null
  const ads = response.ads
  if (!Array.isArray(ads)) return null
  const ad = ads[0]
  if (!ad || typeof ad !== "object") return null
  const timestamp = String(ad.timestamp || Date.now())
  const link = adUrl(ad.statlink, timestamp)
  // Carbon's image/text, rich creative, and Native Network icon assets have
  // different proportions. Choose a template; do not alias one asset to another.
  const smallImage = adUrl(ad.smallImage, timestamp)
  const largeImage = adUrl(ad.largeImage, timestamp)
  const image = adUrl(ad.image, timestamp)
  const logo = adUrl(ad.logo, timestamp)
  const tagline = text(ad.companyTagline)
  const company = text(ad.company)
  let visual: CarbonVisual
  if (largeImage && logo && tagline && company) {
    visual = { kind: "rich", largeImage, logo, tagline }
  } else if (smallImage) {
    visual = { kind: "image-text", smallImage }
  } else if (image) {
    visual = { kind: "native-icon", image }
  } else if (logo) {
    visual = { kind: "logo-text", logo }
  } else {
    // Native Network supports text creatives with company, description and link.
    // Malformed image-bearing responses are rejected, not rendered as text ads.
    if (ad.image || ad.smallImage || ad.logo || ad.largeImage || !company)
      return null
    visual = { kind: "text" }
  }
  const description = text(ad.description)
  if (!link || !description) return null
  let viewUrl =
    ad.should_record_viewable === "1"
      ? adUrl(ad.statview, timestamp)
      : undefined
  if (viewUrl) {
    const url = new URL(viewUrl)
    url.searchParams.set("segment", CARBON_PLACEMENT)
    viewUrl = url.toString()
  }
  return {
    link,
    visual,
    description,
    company,
    callToAction: text(ad.callToAction),
    backgroundColor:
      typeof ad.backgroundColor === "string" &&
      /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
        ad.backgroundColor,
      )
        ? ad.backgroundColor
        : undefined,
    pixels:
      typeof ad.pixel === "string"
        ? ad.pixel.split("||").flatMap((pixel: string) => {
            const url = adUrl(pixel, timestamp)
            return url ? [url] : []
          })
        : [],
    viewUrl,
  }
}

export async function fetchCarbonAd(
  signal: AbortSignal,
  template: "sidebar" | "feed",
) {
  const url = new URL(`https://srv.buysellads.com/ads/${CARBON_ZONE}.json`)
  url.searchParams.set("segment", CARBON_PLACEMENT)
  url.searchParams.set("useragent", navigator.userAgent)
  const preview = new URLSearchParams(location.search)
  if (preview.get("bsaignore") === "yes") url.searchParams.set("ignore", "yes")
  if (preview.get("bsaforcebanner"))
    url.searchParams.set("forcebanner", preview.get("bsaforcebanner")!)
  // This is a direct browser request: the ad server sees the visitor's address.
  // Never substitute our application server's IP or cache ads between visitors.
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    credentials: "omit",
    headers: {
      "x-origin": location.href,
      "x-client": `shipyardhq/${template}`,
    },
  })
  if (!response.ok) return null
  return parseCarbonCreative(await response.json())
}
