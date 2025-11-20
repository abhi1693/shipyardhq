import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-static"
export const revalidate = 86400

const CHUNK_SIZE = 50000

function xml(parts: TemplateStringsArray, ...subs: unknown[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function generateStaticParams(): Promise<
  Array<{ index: string }>
> {
  const total = await prisma.alternativeProduct.count()
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

  const skip = (page - 1) * CHUNK_SIZE
  const alternatives = await prisma.alternativeProduct.findMany({
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true, createdAt: true },
    skip,
    take: CHUNK_SIZE,
  })

  const urls = alternatives
    .map((alternative: (typeof alternatives)[number]) => {
      const last = alternative.updatedAt ?? alternative.createdAt
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(last).getTime()) / 86400000,
      )
      const changefreq =
        daysSinceUpdate <= 7
          ? "daily"
          : daysSinceUpdate <= 60
            ? "weekly"
            : "monthly"
      const priority =
        daysSinceUpdate <= 7 ? "0.7" : daysSinceUpdate <= 180 ? "0.6" : "0.5"

      return xml`
        <url>
          <loc>${base}/alternatives/${alternative.slug}</loc>
          <lastmod>${new Date(last).toISOString()}</lastmod>
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
