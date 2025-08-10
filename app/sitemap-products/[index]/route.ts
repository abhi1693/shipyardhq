import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

const CHUNK_SIZE = 50000

export async function GET(
  _req: Request,
  { params }: { params: { index: string } },
) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
  const page = Number(params.index)
  if (!Number.isFinite(page) || page < 1) {
    return new Response("Invalid index", { status: 400 })
  }

  const skip = (page - 1) * CHUNK_SIZE
  const products = await prisma.product.findMany({
    where: { status: "published" as any },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { updatedAt: "desc" },
    skip,
    take: CHUNK_SIZE,
  })

  const urls = products
    .map((p) => {
      const last = p.updatedAt || p.publishedAt || new Date()
      const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"
      return xml`
        <url>
          <loc>${base}/products/${p.slug}</loc>
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
