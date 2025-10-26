import prisma from "@/lib/prisma"

export const revalidate = 3600

const CHUNK_SIZE = 50000

function xml(parts: TemplateStringsArray, ...subs: unknown[]) {
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

  const skip = (page - 1) * CHUNK_SIZE
  const alternatives = await prisma.alternativeProduct.findMany({
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true, createdAt: true },
    skip,
    take: CHUNK_SIZE,
  })

  const urls = alternatives
    .map((alternative) => {
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
