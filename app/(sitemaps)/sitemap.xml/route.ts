import { resolveSiteUrl } from "@/lib/siteConfig"
import { sitemapIndexXml, sitemapResponse } from "@/lib/sitemap"

export async function GET() {
  const base = resolveSiteUrl()

  return sitemapResponse(
    sitemapIndexXml([
      { loc: `${base}/sitemap-main.xml` },
      { loc: `${base}/sitemap-archives.xml` },
      { loc: `${base}/sitemap-products.xml` },
      { loc: `${base}/sitemap-alternatives.xml` },
      { loc: `${base}/sitemap-tags.xml` },
    ]),
  )
}
