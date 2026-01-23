import { getKeywordTagSitemapStats } from "@/actions/public/tags/actions"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-dynamic"
export const revalidate = 86400

const CHUNK_SIZE = 50000

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function GET() {
  const base = resolveSiteUrl()

  const { total, lastUpdated } = await getKeywordTagSitemapStats()

  const chunks = Math.ceil(total / CHUNK_SIZE)
  const nowIso = new Date().toISOString()
  const lastmod = lastUpdated?.toISOString() ?? nowIso

  const sitemapEntries = Array.from(
    { length: Math.max(chunks, 1) },
    (_, i) => i + 1,
  )
    .map(
      (n) =>
        xml`
        <sitemap>
          <loc>${base}/sitemap-tags/${n}.xml</loc>
          <lastmod>${lastmod}</lastmod>
        </sitemap>
      `,
    )
    .join("")

  const body = xml`
    <?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemapEntries}
    </sitemapindex>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
