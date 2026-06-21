import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"
import {
  getSitemapShardCount,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

export async function GET() {
  const base = resolveSiteUrl()

  const [count, latest] = await Promise.all([
    prisma.alternativeProduct.count(),
    prisma.alternativeProduct.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const chunks = getSitemapShardCount(count)
  const nowIso = new Date().toISOString()
  const lastmod = latest?.updatedAt?.toISOString() ?? nowIso

  return sitemapResponse(
    sitemapIndexXml(
      Array.from({ length: chunks }, (_, index) => ({
        loc: `${base}/sitemap-alternatives/${index + 1}.xml`,
        lastmod,
      })),
    ),
  )
}
