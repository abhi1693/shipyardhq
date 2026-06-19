import type { NextRequest } from "next/server"

import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  SITEMAP_CHUNK_SIZE,
  sitemapChangefreqForAge,
  sitemapResponse,
  type SitemapUrlEntry,
  urlsetXml,
} from "@/lib/sitemap"

type ProductSitemapEntry = Prisma.ProductGetPayload<{
  select: { id: true; slug: true; updatedAt: true; publishedAt: true }
}>

export const dynamic = "force-dynamic"
export const revalidate = 86400

export function generateStaticParams(): Array<{ index: string }> {
  return []
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ index: string }> },
) {
  const base = resolveSiteUrl()
  const { index } = await params
  const page = parseSitemapShardIndex(index)
  if (!page) {
    return new Response("Invalid index", { status: 400 })
  }

  const count = await prisma.product.count({
    where: buildPublicDiscoveryProductWhere(),
  })
  if (isSitemapShardOutOfRange(page, count)) {
    return new Response("Sitemap shard not found", { status: 404 })
  }

  const skip = (page - 1) * SITEMAP_CHUNK_SIZE
  const products = await prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere(),
    select: { id: true, slug: true, updatedAt: true, publishedAt: true },
    orderBy: { updatedAt: "desc" },
    skip,
    take: SITEMAP_CHUNK_SIZE,
  })

  const entries: SitemapUrlEntry[] = products.map(
    (p: ProductSitemapEntry): SitemapUrlEntry => {
      const last = p.updatedAt || p.publishedAt || new Date()
      const days = Math.floor(
        (Date.now() - new Date(last).getTime()) / 86400000,
      )
      const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"

      return {
        loc: `${base}/products/${p.slug}`,
        lastmod: new Date(last),
        changefreq: sitemapChangefreqForAge(days),
        priority,
      }
    },
  )

  return sitemapResponse(urlsetXml(entries))
}
