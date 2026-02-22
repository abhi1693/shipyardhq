import { NextRequest, NextResponse } from "next/server"

import { deleteOwnedProduct } from "@/lib/server/member-product-mutations"
import { memberProductsStatusPath } from "@/lib/routes"

const DEFAULT_SUCCESS_PATH = memberProductsStatusPath("deleted")
const DEFAULT_ERROR_PATH = memberProductsStatusPath("error")

const getPath = (
  value: FormDataEntryValue | null,
  fallback: string,
): string => {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const productId = formData.get("productId")
  const successPath = getPath(formData.get("successPath"), DEFAULT_SUCCESS_PATH)
  const errorPath = getPath(formData.get("errorPath"), DEFAULT_ERROR_PATH)

  if (typeof productId !== "string" || !productId.trim()) {
    return NextResponse.redirect(new URL(errorPath, request.url), 303)
  }

  try {
    const result = await deleteOwnedProduct({ productId })
    const destination = "error" in result ? errorPath : successPath

    return NextResponse.redirect(new URL(destination, request.url), 303)
  } catch {
    return NextResponse.redirect(new URL(errorPath, request.url), 303)
  }
}
