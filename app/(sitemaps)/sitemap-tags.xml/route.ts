import { getKeywordTagSitemapStats } from "@/actions/public/tags/actions"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  getSitemapShardEntries,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET() {
  const base = resolveSiteUrl()

  const { total, lastUpdated } = await getKeywordTagSitemapStats()

  const lastmod = coerceDate(lastUpdated)

  return sitemapResponse(
    sitemapIndexXml(
      getSitemapShardEntries({
        base,
        route: "sitemap-tags",
        total,
        lastmod,
      }),
    ),
  )
}
