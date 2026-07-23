import { connection, type NextRequest } from "next/server"

import {
  getAlternativeSitemapChunk,
  getAlternativeSitemapStats,
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

  const { total } = await getAlternativeSitemapStats()
  if (isSitemapShardOutOfRange(page, total)) {
    return new Response("Sitemap shard not found", { status: 404 })
  }

  const skip = (page - 1) * SITEMAP_CHUNK_SIZE
  const alternatives = await getAlternativeSitemapChunk(
    skip,
    SITEMAP_CHUNK_SIZE,
  )

  const entries: SitemapUrlEntry[] = alternatives.map(
    (alternative: (typeof alternatives)[number]): SitemapUrlEntry => {
      const last = alternative.updatedAt ?? alternative.createdAt
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(last).getTime()) / 86400000,
      )
      const priority =
        daysSinceUpdate <= 7 ? "0.7" : daysSinceUpdate <= 180 ? "0.6" : "0.5"

      return {
        loc: `${base}/alternatives/${alternative.slug}`,
        lastmod: new Date(last),
        changefreq: sitemapChangefreqForAge(daysSinceUpdate),
        priority,
      }
    },
  )

  return sitemapResponse(urlsetXml(entries))
}
