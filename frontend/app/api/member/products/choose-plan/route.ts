import { NextRequest, NextResponse } from "next/server"

import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import { resolveChoosePlanRedirect } from "@/lib/server/member-products"

const safePath = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  return value
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productId?: string
      planId?: string
      redirectPath?: string
    }

    const productId =
      typeof body.productId === "string" ? body.productId.trim() : ""
    const planId = typeof body.planId === "string" ? body.planId.trim() : ""
    const redirectPath = safePath(body.redirectPath, MEMBER_PRODUCTS_PATH)

    if (!productId || !planId) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      )
    }

    const { redirectUrl } = await resolveChoosePlanRedirect({
      productId,
      planId,
      redirectPath,
    })

    return NextResponse.json({ redirectUrl }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to choose plan" },
      { status: 500 },
    )
  }
}
