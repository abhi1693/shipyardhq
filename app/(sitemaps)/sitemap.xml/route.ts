import { resolveSiteUrl } from "@/lib/siteConfig"
import { sitemapIndexXml, sitemapResponse } from "@/lib/sitemap"

export async function GET() {
  const base = resolveSiteUrl()
  const now = new Date().toISOString()

  return sitemapResponse(
    sitemapIndexXml([
      { loc: `${base}/sitemap-main.xml`, lastmod: now },
      { loc: `${base}/sitemap-archives.xml`, lastmod: now },
      { loc: `${base}/sitemap-products.xml`, lastmod: now },
      { loc: `${base}/sitemap-alternatives.xml`, lastmod: now },
      { loc: `${base}/sitemap-tags.xml`, lastmod: now },
    ]),
  )
}
