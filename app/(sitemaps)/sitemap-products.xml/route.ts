import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  getSitemapShardCount,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

export const revalidate = 86400

export async function GET() {
  const base = resolveSiteUrl()

  const [count, latest] = await Promise.all([
    prisma.product.count({ where: buildPublicDiscoveryProductWhere() }),
    prisma.product.findFirst({
      where: buildPublicDiscoveryProductWhere(),
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  const chunks = getSitemapShardCount(count)
  const nowIso = new Date().toISOString()
  const lastmod = latest?.updatedAt?.toISOString() || nowIso

  return sitemapResponse(
    sitemapIndexXml(
      Array.from({ length: chunks }, (_, index) => ({
        loc: `${base}/sitemap-products/${index + 1}.xml`,
        lastmod,
      })),
    ),
  )
}
