"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { trackProductClicked } from "@/lib/server/analytics/productClicks"
import "@/lib/server/analytics/productClicks" // ensure listeners are registered
import { allowOncePerWindow } from "@/lib/server/rateLimit"
import { getClientIp } from "@/lib/server/ip"
import {
  hashIpAddress,
  inferDeviceCategory,
  parseBrowser,
  parseOs,
  sanitizeReferrer,
} from "@/lib/server/analytics/clientMetadata"

function decodeNullable(value?: string | null) {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// Tracks a product card click and redirects to the product detail page
export async function clickProductCardAction(formData: FormData) {
  const productId = String(formData.get("productId") || "")
  const productSlug = String(formData.get("productSlug") || "")
  if (!productId) return redirect("/")
  try {
    const ip = await getClientIp()
    const key = `click:${productId}:${ip}`
    const WINDOW_MS = 10_000
    if (allowOncePerWindow(key, WINDOW_MS)) {
      const hdrs = await headers()
      const userAgent = hdrs.get("user-agent")
      const secChUaMobile = hdrs.get("sec-ch-ua-mobile")
      const secChUa = hdrs.get("sec-ch-ua")
      const secChUaPlatform = hdrs.get("sec-ch-ua-platform")
      const device = inferDeviceCategory(userAgent, secChUaMobile)
      const browser = parseBrowser(userAgent, secChUa)
      const os = parseOs(userAgent, secChUaPlatform)
      const referrerHeader = hdrs.get("referer") ?? hdrs.get("referrer")
      const country = hdrs.get("x-vercel-ip-country")
      const region = hdrs.get("x-vercel-ip-country-region")
      const city = decodeNullable(hdrs.get("x-vercel-ip-city"))
      const ipHash = hashIpAddress(ip)

      await trackProductClicked(productId, {
        referrer: sanitizeReferrer(referrerHeader),
        userAgent,
        device,
        browser,
        os,
        country,
        region,
        city,
        ipHash,
      })
    }
  } catch (err) {
    console.error("click publish failed", err)
  }
  redirect(`/products/${productSlug}`)
}

// For future use: track outbound link clicks distinctly if needed
export async function clickExternalProductLinkAction(formData: FormData) {
  const productId = String(formData.get("productId") || "")
  const to = String(formData.get("to") || "")
  if (!productId || !to) return redirect("/")

  // Allow absolute http(s) or app-relative paths
  const isRelative = to.startsWith("/")
  if (!isRelative) {
    try {
      const target = new URL(to)
      if (!/^https?:$/.test(target.protocol)) return redirect("/")
    } catch {
      return redirect("/")
    }
  }

  try {
    const ip = await getClientIp()
    const key = `click:${productId}:${ip}`
    const WINDOW_MS = 10_000
    if (allowOncePerWindow(key, WINDOW_MS)) {
      const hdrs = await headers()
      const userAgent = hdrs.get("user-agent")
      const secChUaMobile = hdrs.get("sec-ch-ua-mobile")
      const secChUa = hdrs.get("sec-ch-ua")
      const secChUaPlatform = hdrs.get("sec-ch-ua-platform")
      const device = inferDeviceCategory(userAgent, secChUaMobile)
      const browser = parseBrowser(userAgent, secChUa)
      const os = parseOs(userAgent, secChUaPlatform)
      const referrerHeader = hdrs.get("referer") ?? hdrs.get("referrer")
      const country = hdrs.get("x-vercel-ip-country")
      const region = hdrs.get("x-vercel-ip-country-region")
      const city = decodeNullable(hdrs.get("x-vercel-ip-city"))
      const ipHash = hashIpAddress(ip)

      await trackProductClicked(productId, {
        referrer: sanitizeReferrer(referrerHeader),
        userAgent,
        device,
        browser,
        os,
        country,
        region,
        city,
        ipHash,
      })
    }
  } catch (err) {
    console.error("click publish failed", err)
  }
  redirect(to)
}
