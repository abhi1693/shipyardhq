import { NextRequest, NextResponse } from "next/server"

import { updateProductAction } from "@/lib/server/product-management"

type UpdatePayload = Parameters<typeof updateProductAction>[1]

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productId?: string
      payload?: UpdatePayload
    }
    const productId =
      typeof body.productId === "string" ? body.productId.trim() : ""

    if (!productId || !body.payload) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      )
    }

    const result = await updateProductAction(productId, body.payload)
    if (result && typeof result === "object" && "error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    )
  }
}
