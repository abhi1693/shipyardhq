import { NextRequest, NextResponse } from "next/server"

import {
  chooseMemberProductPlan,
  setMemberProductStatus,
} from "@/lib/server/member-product-actions"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

const safePath = (value: FormDataEntryValue | null, fallback: string) => {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const productId = formData.get("productId")
  const redirectPath = safePath(formData.get("redirectPath"), MEMBER_PRODUCTS_PATH)

  if (typeof productId !== "string" || !productId.trim()) {
    return NextResponse.redirect(new URL(redirectPath, request.url), 303)
  }

  const statusResult = await setMemberProductStatus(productId, "published")
  if (statusResult && typeof statusResult === "object" && "error" in statusResult) {
    return NextResponse.redirect(
      new URL(`${redirectPath}?error=publish_failed`, request.url),
      303,
    )
  }

  await chooseMemberProductPlan(
    {
      productId,
      redirectPath,
    },
    formData,
  )

  return NextResponse.redirect(new URL(redirectPath, request.url), 303)
}
