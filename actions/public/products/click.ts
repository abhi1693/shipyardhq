"use server"

import { redirect } from "next/navigation"
import { publish } from "@/lib/server/events"
import "@/lib/server/analytics"

export async function clickProductCardAction(formData: FormData) {
  const productId = String(formData.get("productId") || "")
  if (!productId) return redirect("/")
  try {
    await publish("product.clicked", { productId })
  } catch (err) {
    console.error("click publish failed", err)
  }
  redirect(`/products/${productId}`)
}
