import { NextRequest, NextResponse } from "next/server"

import { resetProductConnectorAction } from "@/lib/server/product-management"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productId?: string
    }
    const productId =
      typeof body.productId === "string" ? body.productId.trim() : ""

    if (!productId) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      )
    }

    const result = await resetProductConnectorAction(productId)
    if (result && typeof result === "object" && "error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to reset connector" },
      { status: 500 },
    )
  }
}
