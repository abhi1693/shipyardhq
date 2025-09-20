import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"

type CategorySitemapEntry = Prisma.CategoryGetPayload<{
  select: { slug: true; updatedAt: true }
}>

export const dynamic = "force-dynamic"

function xml(parts: TemplateStringsArray, ...subs: any[]) {
  return parts.map((p, i) => p + (subs[i] ?? "")).join("")
}

export async function GET() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "")
  const now = new Date()

  const staticPaths = [
    "/",
    "/browse",
    "/leaderboard",
    "/pricing",
    "/categories",
    "/legal/terms",
    "/legal/privacy-policy",
  ] as const

  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  })

  const urls = [
    ...staticPaths.map((path) => {
      let changefreq = "weekly"
      let priority = "0.7"
      switch (path) {
        case "/":
          changefreq = "daily"
          priority = "1.0"
          break
        case "/browse":
          changefreq = "daily"
          priority = "0.9"
          break
        case "/leaderboard":
          changefreq = "daily"
          priority = "0.8"
          break
        case "/pricing":
          changefreq = "monthly"
          priority = "0.6"
          break
        case "/categories":
          changefreq = "weekly"
          priority = "0.7"
          break
        case "/legal/terms":
        case "/legal/privacy-policy":
          changefreq = "yearly"
          priority = "0.3"
          break
      }
      return xml`
        <url>
          <loc>${base}${path}</loc>
          <lastmod>${now.toISOString()}</lastmod>
          <changefreq>${changefreq}</changefreq>
          <priority>${priority}</priority>
        </url>
      `
    }),
    ...categories.map((c: CategorySitemapEntry) => {
      const last = c.updatedAt || now
      const days = Math.floor(
        (now.getTime() - new Date(last).getTime()) / 86400000,
      )
      const changefreq = days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
      const priority = days <= 7 ? "0.7" : days <= 60 ? "0.6" : "0.5"
      return xml`
          <url>
            <loc>${base}/categories/${c.slug}</loc>
            <lastmod>${new Date(last).toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
    }),
  ].join("")

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
