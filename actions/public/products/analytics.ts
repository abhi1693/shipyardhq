"use server"

import { redirect } from "next/navigation"
import { trackProductClicked } from "@/lib/server/analytics/productClicks"
import "@/lib/server/analytics/productClicks" // ensure listeners are registered
import { allowOncePerWindow } from "@/lib/server/rateLimit"
import { getClientIp } from "@/lib/server/ip"

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
      await trackProductClicked(productId)
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
      await trackProductClicked(productId)
    }
  } catch (err) {
    console.error("click publish failed", err)
  }
  redirect(to)
}
