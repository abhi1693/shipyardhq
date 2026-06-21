import { getKeywordTagSitemapStats } from "@/actions/public/tags/actions"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  getSitemapShardCount,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

export const revalidate = 86400

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET() {
  const base = resolveSiteUrl()

  const { total, lastUpdated } = await getKeywordTagSitemapStats()

  const chunks = getSitemapShardCount(total)
  const nowIso = new Date().toISOString()
  const lastmod = coerceDate(lastUpdated)?.toISOString() ?? nowIso

  return sitemapResponse(
    sitemapIndexXml(
      Array.from({ length: chunks }, (_, index) => ({
        loc: `${base}/sitemap-tags/${index + 1}.xml`,
        lastmod,
      })),
    ),
  )
}
