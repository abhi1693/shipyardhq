import { NextRequest, NextResponse } from "next/server"

import { verifyProductDomainAction } from "@/actions/admin/products/actions"

type RouteContext = {
  params: Promise<{
    productId: string
  }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { productId } = await context.params
  if (!productId) {
    return NextResponse.json({ error: "Missing product ID" }, { status: 400 })
  }

  const result = await verifyProductDomainAction(productId)
  return NextResponse.json(result)
}
