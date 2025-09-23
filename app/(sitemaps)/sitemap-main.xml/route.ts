import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  BROWSE_PATH,
  CATEGORIES_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
  categoryPath,
  usecasePath,
} from "@/lib/routes"
import { getPublicUseCasesWithCounts } from "@/actions/public/use-cases/actions"

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
    BROWSE_PATH,
    LEADERBOARD_PATH,
    PRICING_PATH,
    CATEGORIES_PATH,
    "/legal/terms",
    "/legal/privacy-policy",
  ] as const

  const [categories, useCases] = await Promise.all([
    prisma.category.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    getPublicUseCasesWithCounts(),
  ])

  const urls = [
    ...staticPaths.map((path) => {
      let changefreq = "weekly"
      let priority = "0.7"
      switch (path) {
        case "/":
          changefreq = "daily"
          priority = "1.0"
          break
        case BROWSE_PATH:
          changefreq = "daily"
          priority = "0.9"
          break
        case LEADERBOARD_PATH:
          changefreq = "daily"
          priority = "0.8"
          break
        case PRICING_PATH:
          changefreq = "monthly"
          priority = "0.6"
          break
        case CATEGORIES_PATH:
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
            <loc>${base}${categoryPath(c.slug)}</loc>
            <lastmod>${new Date(last).toISOString()}</lastmod>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
          </url>
        `
    }),
    ...useCases
      .filter((useCase) => useCase.productCount > 0)
      .map((useCase) => {
        const last = useCase.updatedAt || now
        const days = Math.floor(
          (now.getTime() - new Date(last).getTime()) / 86400000,
        )
        const changefreq =
          days <= 7 ? "daily" : days <= 60 ? "weekly" : "monthly"
        const priority = days <= 7 ? "0.6" : days <= 60 ? "0.5" : "0.4"
        return xml`
          <url>
            <loc>${base}${usecasePath(useCase.slug)}</loc>
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
