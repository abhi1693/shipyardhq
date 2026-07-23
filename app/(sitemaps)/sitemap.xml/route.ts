import { getKeywordTagSitemapStats } from "@/actions/public/tags/actions"
import {
  getAlternativeSitemapStats,
  getProductSitemapStats,
} from "@/lib/server/sitemap-data"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  getSitemapShardEntries,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

export async function GET() {
  const base = resolveSiteUrl()
  const [products, alternatives, tags] = await Promise.all([
    getProductSitemapStats(),
    getAlternativeSitemapStats(),
    getKeywordTagSitemapStats(),
  ])

  return sitemapResponse(
    sitemapIndexXml([
      { loc: `${base}/sitemap-main.xml` },
      { loc: `${base}/sitemap-archives.xml` },
      ...getSitemapShardEntries({
        base,
        route: "sitemap-products",
        total: products.total,
        lastmod: products.lastUpdated,
      }),
      ...getSitemapShardEntries({
        base,
        route: "sitemap-alternatives",
        total: alternatives.total,
        lastmod: alternatives.lastUpdated,
      }),
      ...getSitemapShardEntries({
        base,
        route: "sitemap-tags",
        total: tags.total,
        lastmod: tags.lastUpdated,
      }),
      { loc: `${base}/sitemap-tools.xml` },
    ]),
  )
}
