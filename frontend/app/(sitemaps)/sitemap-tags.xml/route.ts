import { getTagDirectoryApiV1PublicTagsDirectoryGet } from "@/lib/generated/fastapi/public-homepage"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-dynamic"
export const revalidate = 86400

const PAGE_SIZE = 200

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function GET() {
  const base = resolveSiteUrl()

  const response = await getTagDirectoryApiV1PublicTagsDirectoryGet({
    page: 1,
    pageSize: PAGE_SIZE,
    includeTotal: true,
  })
  const items = response.status === 200 ? response.data.items : []
  const total =
    response.status === 200 ? (response.data.total ?? items.length) : 0
  const chunks = Math.ceil(total / PAGE_SIZE)
  const lastmod = new Date().toISOString()

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
