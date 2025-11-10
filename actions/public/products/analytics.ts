"use server"

import { auth } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"

import { trackProductClicked } from "@/lib/server/analytics/productClicks"
import "@/lib/server/analytics/productClicks" // ensure listeners are registered
import { getClientIp } from "@/lib/server/ip"
import { productPath } from "@/lib/routes"
import {
  hashIpAddress,
  inferDeviceCategory,
  parseBrowser,
  parseOs,
  sanitizeReferrer,
} from "@/lib/server/analytics/clientMetadata"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { awardProductVisitReward } from "@/lib/server/rewards/engagement"
import { getProductOwnerId } from "@/lib/server/rewards/helpers"

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
    const metadata = {
      referrer: sanitizeReferrer(referrerHeader),
      userAgent,
      device,
      browser,
      os,
      country,
      region,
      city,
      ipHash,
    }

    after(async () => {
      try {
        await trackProductClicked(productId, metadata)
      } catch (err) {
        console.error("click publish failed", err)
      }
    })
  } catch (err) {
    console.error("click publish scheduling failed", err)
  }
  redirect(productSlug ? productPath(productSlug) : "/")
}

// For future use: track outbound link clicks distinctly if needed
export async function clickExternalProductLinkAction(formData: FormData) {
  const productId = String(formData.get("productId") || "")
  const to = String(formData.get("to") || "")
  const skipRedirect = formData.get("skipRedirect") === "1"
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
    const { userId: clerkUserId } = await auth()
    const viewer = clerkUserId
      ? await getActiveUserByClerkId(clerkUserId)
      : null
    const viewerId = viewer?.id ?? null

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

    const metadata = {
      referrer: sanitizeReferrer(referrerHeader),
      userAgent,
      device,
      browser,
      os,
      country,
      region,
      city,
      ipHash,
    }

    after(async () => {
      try {
        await trackProductClicked(productId, metadata)
      } catch (err) {
        console.error("click publish failed", err)
      }

      if (viewerId) {
        try {
          const ownerId = await getProductOwnerId(productId)
          if (!ownerId || ownerId !== viewerId) {
            await awardProductVisitReward({
              userId: viewerId,
              productId,
              destination: to,
            })
          }
        } catch (err) {
          console.error("reward award failed for product CTA click", err)
        }
      }
    })
  } catch (err) {
    console.error("click publish scheduling failed", err)
  }
  if (!skipRedirect) {
    redirect(to)
  }
}
