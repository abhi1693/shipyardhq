import prisma from "@/lib/prisma"

export const dynamic = "force-static"
export const revalidate = 3600

const CHUNK_SIZE = 50000

function xml(parts: TemplateStringsArray, ...subs: unknown[]) {
  return parts.map((part, index) => part + (subs[index] ?? "")).join("")
}

export async function GET() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")

  const [count, latest] = await Promise.all([
    prisma.alternativeProduct.count(),
    prisma.alternativeProduct.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const chunks = Math.ceil(count / CHUNK_SIZE)
  const nowIso = new Date().toISOString()
  const lastmod = latest?.updatedAt?.toISOString() ?? nowIso

  const sitemaps = Array.from({ length: Math.max(chunks, 1) }, (_, index) => index + 1)
    .map(
      (page) => xml`
        <sitemap>
          <loc>${base}/sitemap-alternatives/${page}.xml</loc>
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
