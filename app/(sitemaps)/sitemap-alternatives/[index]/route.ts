import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  SITEMAP_CHUNK_SIZE,
  sitemapResponse,
  urlsetXml,
} from "@/lib/sitemap"

export const dynamic = "force-dynamic"
export const revalidate = 86400

export function generateStaticParams(): Array<{ index: string }> {
  return []
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ index: string }> },
) {
  const base = resolveSiteUrl()

  const { index } = await params
  const page = parseSitemapShardIndex(index)
  if (!page) {
    return new Response("Invalid index", { status: 400 })
  }

  const count = await prisma.alternativeProduct.count()
  if (isSitemapShardOutOfRange(page, count)) {
    return new Response("Sitemap shard not found", { status: 404 })
  }

  const skip = (page - 1) * SITEMAP_CHUNK_SIZE
  const alternatives = await prisma.alternativeProduct.findMany({
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true, createdAt: true },
    skip,
    take: SITEMAP_CHUNK_SIZE,
  })

  return sitemapResponse(
    urlsetXml(
      alternatives.map((alternative: (typeof alternatives)[number]) => {
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
          daysSinceUpdate <= 7
            ? "0.7"
            : daysSinceUpdate <= 180
              ? "0.6"
              : "0.5"

        return {
          loc: `${base}/alternatives/${alternative.slug}`,
          lastmod: new Date(last),
          changefreq,
          priority,
        }
      }),
    ),
  )
}
