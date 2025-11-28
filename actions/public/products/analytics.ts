"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { after } from "next/server"

import { productPath } from "@/lib/routes"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { awardProductVisitReward } from "@/lib/server/rewards/engagement"
import { getProductOwnerId } from "@/lib/server/rewards/helpers"

// Tracks a product card click and redirects to the product detail page
export async function clickProductCardAction(formData: FormData) {
  const productId = String(formData.get("productId") || "")
  const productSlug = String(formData.get("productSlug") || "")
  if (!productId) return redirect("/")
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
    const { userId: clerkUserId } = await auth()
    const viewer = clerkUserId
      ? await getActiveUserByClerkId(clerkUserId)
      : null
    const viewerId = viewer?.id ?? null
    after(async () => {
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
