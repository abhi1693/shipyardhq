import prisma from "@/lib/prisma"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import {
  getSitemapShardCount,
  sitemapIndexXml,
  sitemapResponse,
} from "@/lib/sitemap"

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
  const lastmod = latest?.updatedAt?.toISOString()

  return sitemapResponse(
    sitemapIndexXml(
      Array.from({ length: chunks }, (_, index) => ({
        loc: `${base}/sitemap-products/${index + 1}.xml`,
        lastmod,
      })),
    ),
  )
}
