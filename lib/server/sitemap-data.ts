import { getPublicUseCasesWithCounts } from "@/actions/public/use-cases/actions"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import prisma from "@/lib/prisma"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"

const SITEMAP_DATA_TTL = DEFAULT_TTL.slowest

export async function getMainSitemapCategories() {
  "use cache"
  applyCache([TAGS.categories, TAGS.products], SITEMAP_DATA_TTL)

  return prisma.category.findMany({
    select: {
      slug: true,
      updatedAt: true,
      _count: {
        select: {
          productAssignments: {
            where: { product: buildPublicDiscoveryProductWhere() },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getMainSitemapData() {
  const [categories, useCases] = await Promise.all([
    getMainSitemapCategories(),
    getPublicUseCasesWithCounts(),
  ])

  return { categories, useCases }
}

export async function getProductSitemapStats() {
  "use cache"
  applyCache([TAGS.products], SITEMAP_DATA_TTL)

  const where = buildPublicDiscoveryProductWhere()
  const [total, latest] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  return {
    total,
    lastUpdated: latest?.updatedAt ?? null,
  }
}

export async function getProductSitemapChunk(offset: number, limit: number) {
  "use cache"
  applyCache([TAGS.products], SITEMAP_DATA_TTL)

  const safeOffset = Math.max(0, Math.trunc(offset))
  const safeLimit = Math.max(1, Math.trunc(limit))

  return prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere(),
    select: { id: true, slug: true, updatedAt: true, publishedAt: true },
    orderBy: { updatedAt: "desc" },
    skip: safeOffset,
    take: safeLimit,
  })
}

export async function getAlternativeSitemapStats() {
  "use cache"
  applyCache([TAGS.alternativeProducts], SITEMAP_DATA_TTL)

  const [total, latest] = await Promise.all([
    prisma.alternativeProduct.count(),
    prisma.alternativeProduct.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ])

  return {
    total,
    lastUpdated: latest?.updatedAt ?? null,
  }
}

export async function getAlternativeSitemapChunk(
  offset: number,
  limit: number,
) {
  "use cache"
  applyCache([TAGS.alternativeProducts], SITEMAP_DATA_TTL)

  const safeOffset = Math.max(0, Math.trunc(offset))
  const safeLimit = Math.max(1, Math.trunc(limit))

  return prisma.alternativeProduct.findMany({
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true, createdAt: true },
    skip: safeOffset,
    take: safeLimit,
  })
}
