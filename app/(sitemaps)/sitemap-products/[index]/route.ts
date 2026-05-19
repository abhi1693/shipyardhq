import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { resolveSiteUrl } from "@/lib/siteConfig"

type ProductSitemapEntry = Prisma.ProductGetPayload<{
  select: { id: true; slug: true; updatedAt: true; publishedAt: true }
}>

export const dynamic = "force-dynamic"
export const revalidate = 86400

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

const CHUNK_SIZE = 50000

export function generateStaticParams(): Array<{ index: string }> {
  return []
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
  const products = await prisma.product.findMany({
    where: { status: "published" as any },
    select: { id: true, slug: true, updatedAt: true, publishedAt: true },
    orderBy: { updatedAt: "desc" },
    skip,
    take: CHUNK_SIZE,
  })

  const urls = products
    .map((p: ProductSitemapEntry) => {
      const last = p.updatedAt || p.publishedAt || new Date()
      const days = Math.floor(
        (Date.now() - new Date(last).getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"

      const entries = [
        xml`
        <url>
          <loc>${base}/products/${p.slug}</loc>
          <lastmod>${new Date(last).toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `,
      ]

      return entries.join("")
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
