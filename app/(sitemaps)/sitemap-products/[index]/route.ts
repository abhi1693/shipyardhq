import { connection, type NextRequest } from "next/server"

import {
  getProductSitemapChunk,
  getProductSitemapStats,
} from "@/lib/server/sitemap-data"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  SITEMAP_CHUNK_SIZE,
  sitemapChangefreqForAge,
  sitemapResponse,
  type SitemapUrlEntry,
  urlsetXml,
} from "@/lib/sitemap"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ index: string }> },
) {
  await connection()

  const base = resolveSiteUrl()
  const { index } = await params
  const page = parseSitemapShardIndex(index)
  if (!page) {
    return new Response("Invalid index", { status: 400 })
  }

  const { total } = await getProductSitemapStats()
  if (isSitemapShardOutOfRange(page, total)) {
    return new Response("Sitemap shard not found", { status: 404 })
  }

  const skip = (page - 1) * SITEMAP_CHUNK_SIZE
  const products = await getProductSitemapChunk(skip, SITEMAP_CHUNK_SIZE)

  const entries: SitemapUrlEntry[] = products.map((p): SitemapUrlEntry => {
    const last = p.updatedAt || p.publishedAt
    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
    const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"

    return {
      loc: `${base}/products/${p.slug}`,
      lastmod: new Date(last),
      changefreq: sitemapChangefreqForAge(days),
      priority,
    }
  })

  return sitemapResponse(urlsetXml(entries))
}
