import { NextResponse } from "next/server"

import {
  getPublicProductMetaBySlugServer,
  getPublicProductRevenueServer,
} from "@/lib/server/generated-public"

type RevenueResponse = {
  loading: boolean
  currencyCode?: string
  data: Array<{
    date: string
    revenue: number
  }>
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params
  const product = await getPublicProductMetaBySlugServer(slug)
  if (
    !product ||
    product.status !== "published" ||
    product.pricingModel === "free"
  ) {
    return NextResponse.json<RevenueResponse>({ loading: false, data: [] })
  }

  const revenue = await getPublicProductRevenueServer(product.id)
  if (!revenue || !revenue.points.length) {
    return NextResponse.json<RevenueResponse>({ loading: false, data: [] })
  }

  const data = revenue.points.map((point) => ({
    date: point.periodStart.slice(0, 10),
    revenue: (point.periodRevenueCents ?? 0) / 100,
  }))

  return NextResponse.json<RevenueResponse>({
    loading: false,
    currencyCode: revenue.currencyCode,
    data,
  })
}
