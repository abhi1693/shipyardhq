import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"

export const dynamic = "force-static"
export const revalidate = 86400

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

const CHUNK_SIZE = 50000

export async function GET() {
  const base = resolveSiteUrl()

  const [count, latest] = await Promise.all([
    prisma.product.count({ where: { status: "published" as any } }),
    prisma.product.findFirst({
      where: { status: "published" as any },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const chunks = Math.ceil(count / CHUNK_SIZE)
  const nowIso = new Date().toISOString()
  const lastmod = latest?.updatedAt?.toISOString() || nowIso

  const sitemaps = Array.from({ length: Math.max(chunks, 1) }, (_, i) => i + 1)
    .map(
      (n) =>
        xml`
        <sitemap>
          <loc>${base}/sitemap-products/${n}.xml</loc>
          <lastmod>${lastmod}</lastmod>
        </sitemap>
      `,
    )
    .join("")

  const body = xml`
    <?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemaps}
    </sitemapindex>
  `.trim()

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
