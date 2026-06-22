import type { NextRequest } from "next/server"

import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  isSitemapShardOutOfRange,
  parseSitemapShardIndex,
  SITEMAP_CHUNK_SIZE,
  sitemapChangefreqForAge,
  sitemapResponse,
  type SitemapUrlEntry,
  urlsetXml,
} from "@/lib/sitemap"

export async function GET(
  _req: NextRequest,
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

  const entries: SitemapUrlEntry[] = alternatives.map(
    (alternative: (typeof alternatives)[number]): SitemapUrlEntry => {
      const last = alternative.updatedAt ?? alternative.createdAt
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(last).getTime()) / 86400000,
      )
      const priority =
        daysSinceUpdate <= 7 ? "0.7" : daysSinceUpdate <= 180 ? "0.6" : "0.5"

      return {
        loc: `${base}/alternatives/${alternative.slug}`,
        lastmod: new Date(last),
        changefreq: sitemapChangefreqForAge(daysSinceUpdate),
        priority,
      }
    },
  )

  return sitemapResponse(urlsetXml(entries))
}
