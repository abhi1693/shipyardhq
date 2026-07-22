import { NextResponse, type NextRequest } from "next/server"

import prisma from "@/lib/prisma"
import { recordProductWebsiteClick } from "@/lib/server/analytics/productWebsiteClicks"

interface RouteContext {
  params: Promise<{ slug?: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { slug: rawSlug } = await params
  const slug = rawSlug?.trim()
  if (!slug) {
    return NextResponse.json({ error: "Missing product slug" }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })
  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  await recordProductWebsiteClick(product.id)

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  })
}
