import { NextRequest, NextResponse } from "next/server"

import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import { setProductStatusAction } from "@/lib/server/product-management"
import { resolveChoosePlanRedirect } from "@/lib/server/member-products"

const safePath = (value: FormDataEntryValue | null, fallback: string) => {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const productId = formData.get("productId")
  const planId = formData.get("planId")
  const redirectPath = safePath(formData.get("redirectPath"), MEMBER_PRODUCTS_PATH)

  if (
    typeof productId !== "string" ||
    !productId.trim() ||
    typeof planId !== "string" ||
    !planId.trim()
  ) {
    return NextResponse.redirect(new URL(redirectPath, request.url), 303)
  }

  const statusResult = await setProductStatusAction(productId, "published")
  if (statusResult && typeof statusResult === "object" && "error" in statusResult) {
    return NextResponse.redirect(
      new URL(`${redirectPath}?error=publish_failed`, request.url),
      303,
    )
  }

  const { redirectUrl } = await resolveChoosePlanRedirect({
    productId,
    planId,
    redirectPath,
  })
  return NextResponse.redirect(new URL(redirectUrl, request.url), 303)
}
