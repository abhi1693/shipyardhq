"use server"

import { redirect } from "next/navigation"
import { trackProductClicked } from "@/lib/server/analytics/productClicks"
import "@/lib/server/analytics/productClicks" // ensure listeners are registered

// Tracks a product card click and redirects to the product detail page
export async function clickProductCardAction(formData: FormData) {
  const productId = String(formData.get("productId") || "")
  if (!productId) return redirect("/")
  try {
    await trackProductClicked(productId)
  } catch (err) {
    console.error("click publish failed", err)
  }
  redirect(`/products/${productId}`)
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
    await trackProductClicked(productId)
  } catch (err) {
    console.error("click publish failed", err)
  }
  redirect(to)
}
