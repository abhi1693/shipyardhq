import { getKeywordTagSitemapChunk } from "@/actions/public/tags/actions"

export const revalidate = 3600

const CHUNK_SIZE = 50000

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ index: string }> },
) {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
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
