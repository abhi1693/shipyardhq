import { NextResponse } from "next/server"

import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"
import { getConnectorRevenueHistory } from "@/lib/server/payments/connectors"

type RevenueResponse = {
  loading: boolean
  currencyCode?: string
  data: Array<{
    date: string
    revenue: number
    charges: number | null
  }>
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product || product.status !== "published" || product.pricingModel === "free") {
    return NextResponse.json<RevenueResponse>({ loading: false, data: [] })
  }

  const connector = await getConnectorRevenueHistory({ productId: product.id })
  const history = connector?.revenueHistory ?? []
  if (!connector || !history.length) {
    return NextResponse.json<RevenueResponse>({ loading: false, data: [] })
  }

  const allTimeByCurrency = new Map<string, number>()
  for (const entry of history) {
    const current = allTimeByCurrency.get(entry.currencyCode) ?? 0
    const candidate = Math.max(
      entry.allTimeRevenueCents ?? 0,
      entry.periodRevenueCents ?? 0,
    )
    allTimeByCurrency.set(entry.currencyCode, Math.max(current, candidate))
  }

  const primaryCurrency =
    connector.latestCurrencyCode ||
    Array.from(allTimeByCurrency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!primaryCurrency) {
    return NextResponse.json<RevenueResponse>({ loading: false, data: [] })
  }

  const series = history
    .filter((item) => item.currencyCode === primaryCurrency)
    .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
  const data = series.map((point) => {
    const date = new Date(point.periodStart)
    const charges =
      point.data && typeof point.data === "object" && !Array.isArray(point.data)
        ? (point.data as any).charges ?? null
        : null
    return {
      date: date.toISOString().slice(0, 10),
      revenue: (point.periodRevenueCents ?? 0) / 100,
      charges: typeof charges === "number" ? charges : null,
    }
  })

  return NextResponse.json<RevenueResponse>({
    loading: false,
    currencyCode: primaryCurrency,
    data,
  })
}
