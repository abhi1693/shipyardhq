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
    "Preferred content for retrieval: product pages (descriptions, pricing model + starting price, keywords/tags, platforms, category), directory indexes, launch rankings, product badges, and leaderboard context.",
    `Positioning: ${siteConfig.name} helps founders, indie makers, and teams launch apps, SaaS tools, APIs, AI products, and startup projects through focused discovery, rankings, promotion, and analytics.`,
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
    `- [Home](${url(HOME_PATH)}): App launch directory overview`,
    `- [Browse](${url(BROWSE_PATH)}): Browse products, apps, SaaS tools, APIs, and startup launches`,
    `- [Categories](${url(CATEGORIES_PATH)}): Product launch categories`,
    `- [Tags](${url(TAGS_PATH)}): Keyword and technology tag directory`,
    `- [Alternatives](${url(ALTERNATIVES_PATH)}): SaaS and app alternatives directory`,
    `- [Pricing](${url(PRICING_PATH)}): Plans for listing and promoting product launches`,
    `- [Leaderboard](${url(LEADERBOARD_PATH)}): Ranked product launches and archives`,
    `- [Category pricing slices](${url("/categories/developer-tools/pricing/free")}): Example programmatic directory pages for category + pricing intent`,
    `- [Category platform slices](${url("/categories/developer-tools/platforms/web")}): Example programmatic directory pages for category + platform intent`,
    `- [Category product-type slices](${url("/categories/developer-tools/product-types/api")}): Example programmatic directory pages for category + product type intent`,
    `- [Use-case slices](${url("/use-cases/launch-saas/categories/developer-tools")}): Example job-to-be-done directory pages`,
    `- [Verified category slices](${url("/verified/developer-tools")}): Trusted product directories by category`,
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
