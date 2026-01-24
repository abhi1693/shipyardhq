import { getTagDirectoryApiV1PublicTagsDirectoryGet } from "@/lib/generated/fastapi/public-homepage"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-dynamic"
export const revalidate = 86400

const PAGE_SIZE = 200

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function generateStaticParams(): Promise<
  Array<{ index: string }>
> {
  try {
    const response = await getTagDirectoryApiV1PublicTagsDirectoryGet({
      page: 1,
      pageSize: PAGE_SIZE,
      includeTotal: true,
    })
    const items = response.status === 200 ? response.data.items : []
    const total =
      response.status === 200 ? (response.data.total ?? items.length) : 0
    const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

    return Array.from({ length: totalPages }, (_, pageIndex) => ({
      index: String(pageIndex + 1),
    }))
  } catch {
    return [{ index: "1" }]
  }
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
  const response = await getTagDirectoryApiV1PublicTagsDirectoryGet({
    page,
    pageSize: PAGE_SIZE,
  })
  const tags = response.status === 200 ? response.data.items : []

  const urls = tags
    .map((tag) => {
      const last = tag.lastUpdated ? new Date(tag.lastUpdated) : new Date()
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
