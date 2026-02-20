import { NextRequest, NextResponse } from "next/server"

import { setMemberProductStatus } from "@/lib/server/member-product-actions"

const VALID_STATUSES = new Set(["draft", "published", "archived"])

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productId?: string
      status?: string
    }
    const productId =
      typeof body.productId === "string" ? body.productId.trim() : ""
    const status = typeof body.status === "string" ? body.status.trim() : ""

    if (!productId || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const result = await setMemberProductStatus(productId, status as any)
    if (result && typeof result === "object" && "error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
