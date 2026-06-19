import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"
import {
  ALTERNATIVES_PATH,
  BROWSE_PATH,
  CATEGORIES_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
  TAGS_PATH,
} from "@/lib/routes"

export const dynamic = "force-static"
export const revalidate = 86400

const toText = (lines: string[]) => `${lines.join("\n").trim()}\n`

export async function GET() {
  const base = resolveSiteUrl()
  const url = (path: string) => new URL(path, base).toString()

  const body = toText([
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.tagline} (${base})`,
    "",
    "Preferred content for retrieval: product pages (descriptions, pricing model + starting price, keywords/tags, platforms, category), product badges, and leaderboard context.",
    "For dynamic content, prefer using the sitemap indexes below to discover canonical URLs.",
    "",
    "## Indexes",
    `- [Sitemap index](${url("/sitemap.xml")}): Entry point for all sitemaps`,
    `- [Main sitemap](${url("/sitemap-main.xml")}): Core site pages`,
    `- [Products sitemap](${url("/sitemap-products.xml")}): Product pages (/products/{slug})`,
    `- [Categories sitemap](${url("/sitemap-archives.xml")}): Category/platform/pricing archives`,
    `- [Alternatives sitemap](${url("/sitemap-alternatives.xml")}): Alternative pages (/alternatives/{slug})`,
    `- [Tags sitemap](${url("/sitemap-tags.xml")}): Tag pages (/tags/{slug})`,
    "",
    "## Key pages",
    `- [Home](${url(HOME_PATH)}): Landing page`,
    `- [Browse](${url(BROWSE_PATH)}): Product directory`,
    `- [Categories](${url(CATEGORIES_PATH)}): Category directory`,
    `- [Tags](${url(TAGS_PATH)}): Tag directory`,
    `- [Alternatives](${url(ALTERNATIVES_PATH)}): Alternatives directory`,
    `- [Pricing](${url(PRICING_PATH)}): Plans and pricing`,
    `- [Leaderboard](${url(LEADERBOARD_PATH)}): Rankings and archives`,
    "",
    "## Contact",
    `- [Support email](mailto:${siteConfig.adminEmail})`,
    "",
    "## Optional",
    `- [Why Shipyard](${url("/why-shipyard")}): Positioning and product overview`,
    `- [Privacy policy](${url("/legal/privacy-policy")})`,
    `- [Terms](${url("/legal/terms")})`,
  ])

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
