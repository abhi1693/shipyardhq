import { getAlternativeSitemapStats } from "@/lib/server/sitemap-data"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  getSitemapShardEntries,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

export async function GET() {
  const base = resolveSiteUrl()

  const { total, lastUpdated } = await getAlternativeSitemapStats()

  return sitemapResponse(
    sitemapIndexXml(
      getSitemapShardEntries({
        base,
        route: "sitemap-alternatives",
        total,
        lastmod: lastUpdated,
      }),
    ),
  )
}
