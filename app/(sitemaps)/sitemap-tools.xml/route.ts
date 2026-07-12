import { TOOLS_PATH } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { sitemapResponse, urlsetXml } from "@/lib/sitemap"
import { FREE_SEO_TOOLS, freeToolPath } from "@/lib/tools/catalog"

export function GET() {
  const base = resolveSiteUrl()

  return sitemapResponse(
    urlsetXml([
      {
        loc: `${base}${TOOLS_PATH}`,
        changefreq: "weekly",
        priority: 0.8,
      },
      ...FREE_SEO_TOOLS.map((tool) => ({
        loc: `${base}${freeToolPath(tool.slug)}`,
        changefreq: "monthly" as const,
        priority: 0.7,
      })),
    ]),
  )
}
