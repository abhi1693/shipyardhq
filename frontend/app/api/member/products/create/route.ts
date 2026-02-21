import { NextRequest, NextResponse } from "next/server"

import { createProductAction } from "@/lib/server/product-management"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await createProductAction(formData)
    if (result && typeof result === "object" && "error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    )
  }
}
