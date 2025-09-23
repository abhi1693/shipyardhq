export const dynamic = "force-dynamic"

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

export async function GET() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
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
    </sitemapindex>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
