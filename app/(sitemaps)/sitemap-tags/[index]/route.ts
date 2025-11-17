import {
  getKeywordTagSitemapChunk,
  getKeywordTagSitemapStats,
} from "@/actions/public/tags/actions"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-static"
export const revalidate = 86400

const CHUNK_SIZE = 50000

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function generateStaticParams(): Promise<
  Array<{ index: string }>
> {
  const { total } = await getKeywordTagSitemapStats()
  const totalPages = Math.max(Math.ceil(total / CHUNK_SIZE), 1)

  return Array.from({ length: totalPages }, (_, pageIndex) => ({
    index: String(pageIndex + 1),
  }))
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ index: string }> },
) {
  const base = resolveSiteUrl()
  const { index } = await params
  const page = Number(index)
  if (!Number.isFinite(page) || page < 1) {
    return new Response("Invalid index", { status: 400 })
  }

  const offset = (page - 1) * CHUNK_SIZE
  const tags = await getKeywordTagSitemapChunk(offset, CHUNK_SIZE)

  const urls = tags
    .map((tag) => {
      const last = tag.lastUpdated ?? new Date()
      const days = Math.floor((Date.now() - last.getTime()) / 86400000)
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"

      return xml`
        <url>
          <loc>${base}/tags/${tag.slug}</loc>
          <lastmod>${last.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    })
    .join("")

  const body = xml`
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
