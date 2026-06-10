import {
  getKeywordTagSitemapChunk,
  getKeywordTagSitemapStats,
} from "@/actions/public/tags/actions"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  SITEMAP_CHUNK_SIZE,
  sitemapResponse,
  urlsetXml,
} from "@/lib/sitemap"

export const dynamic = "force-dynamic"
export const revalidate = 86400

export function generateStaticParams(): Array<{ index: string }> {
  return []
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ index: string }> },
) {
  const base = resolveSiteUrl()
  const { index } = await params
  const page = parseSitemapShardIndex(index)
  if (!page) {
    return new Response("Invalid index", { status: 400 })
  }

  const { total } = await getKeywordTagSitemapStats()
  if (isSitemapShardOutOfRange(page, total)) {
    return new Response("Sitemap shard not found", { status: 404 })
  }

  const offset = (page - 1) * SITEMAP_CHUNK_SIZE
  const tags = await getKeywordTagSitemapChunk(offset, SITEMAP_CHUNK_SIZE)

  return sitemapResponse(
    urlsetXml(
      tags.map((tag) => {
        const last = tag.lastUpdated ?? new Date()
        const days = Math.floor((Date.now() - last.getTime()) / 86400000)
        const changefreq =
          days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
        const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"

        return {
          loc: `${base}/tags/${tag.slug}`,
          lastmod: last,
          changefreq,
          priority,
        }
      }),
    ),
  )
}
