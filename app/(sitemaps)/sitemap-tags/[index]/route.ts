import type { NextRequest } from "next/server"

import {
  getKeywordTagSitemapChunk,
  getKeywordTagSitemapStats,
} from "@/actions/public/tags/actions"
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

export const revalidate = 86400

function coerceDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function generateStaticParams(): Array<{ index: string }> {
  return []
}

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

  const { total } = await getKeywordTagSitemapStats()
  if (isSitemapShardOutOfRange(page, total)) {
    return new Response("Sitemap shard not found", { status: 404 })
  }

  const offset = (page - 1) * SITEMAP_CHUNK_SIZE
  const tags = await getKeywordTagSitemapChunk(offset, SITEMAP_CHUNK_SIZE)

  const entries: SitemapUrlEntry[] = tags.map((tag): SitemapUrlEntry => {
    const last = coerceDate(tag.lastUpdated) ?? new Date()
    const days = Math.floor((Date.now() - last.getTime()) / 86400000)
    const priority = days <= 7 ? "0.9" : days <= 180 ? "0.8" : "0.7"

    return {
      loc: `${base}/tags/${tag.slug}`,
      lastmod: last,
      changefreq: sitemapChangefreqForAge(days),
      priority,
    }
  })

  return sitemapResponse(urlsetXml(entries))
}
