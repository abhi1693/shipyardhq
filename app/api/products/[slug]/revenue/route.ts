import { NextResponse } from "next/server"

import {
  getPublicProductMetaBySlug,
  getPublicProductRevenue,
} from "@/actions/public/products/actions"

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
  const product = await getPublicProductMetaBySlug(slug)
  if (
    !product ||
    product.status !== "published" ||
    product.pricingModel === "free"
  ) {
    return NextResponse.json<RevenueResponse>({ loading: false, data: [] })
  }

  const revenue = await getPublicProductRevenue(product.id)
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
