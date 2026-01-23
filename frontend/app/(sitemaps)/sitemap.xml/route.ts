import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-static"
export const revalidate = 86400

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

export async function GET() {
  const base = resolveSiteUrl()
  const now = new Date().toISOString()
  const body = xml`
    <?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>${base}/sitemap-main.xml</loc>
        <lastmod>${now}</lastmod>
      </sitemap>
      <sitemap>
        <loc>${base}/sitemap-archives.xml</loc>
        <lastmod>${now}</lastmod>
      </sitemap>
      <sitemap>
        <loc>${base}/sitemap-products.xml</loc>
        <lastmod>${now}</lastmod>
      </sitemap>
      <sitemap>
        <loc>${base}/sitemap-alternatives.xml</loc>
        <lastmod>${now}</lastmod>
      </sitemap>
      <sitemap>
        <loc>${base}/sitemap-tags.xml</loc>
        <lastmod>${now}</lastmod>
      </sitemap>
    </sitemapindex>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
