import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"
import { resolveVoteState } from "@/lib/server/productVotesStore"
import { safelyReadStaticParams } from "@/lib/staticParams"
import {
  buildPublicDiscoveryProductWhere,
  buildPublicDiscoverySqlFilter,
} from "@/lib/products/public-discovery"

const publicProductSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  websiteUrl: true,
  logo: true,
  bannerImage: true,
  pricingModel: true,
  startingPriceCents: true,
  currencyCode: true,
  platforms: true,
  status: true,
  type: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  category: {
    include: {
      useCases: {
        include: {
          useCase: {
            select: {
              slug: true,
              label: true,
            },
          },
        },
      },
    },
  },
  alternatives: {
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      websiteUrl: true,
      logoUrl: true,
    },
  },
  user: {
    select: {
      id: true,
      clerkId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  metadata: {
    select: {
      videoUrl: true,
      utmCampaign: true,
    },
  },
  analytics: {
    select: {
      upvotes: true,
    },
  },
  _count: {
    select: {
      ProductUpvote: true,
    },
  },
  verification: {
    select: {
      isVerified: true,
    },
  },
  ProductMedia: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      imageUrl: true,
      altText: true,
    },
  },
  ProductBadge: {
    select: {
      badge: true,
      expiresAt: true,
    },
  },
  plan: {
    select: {
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

type PublicProduct = Prisma.ProductGetPayload<{
  select: typeof publicProductSelect
}>

const publicProductMetaSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  publishedAt: true,
  createdAt: true,
  logo: true,
  bannerImage: true,
  keywords: true,
  status: true,
  type: true,
  pricingModel: true,
  platforms: true,
  websiteUrl: true,
  verification: {
    select: {
      isVerified: true,
    },
  },
  category: { select: { name: true, slug: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
  analytics: { select: { upvotes: true } },
  metadata: { select: { videoUrl: true, utmCampaign: true } },
  ProductMedia: {
    select: {
      id: true,
      imageUrl: true,
      altText: true,
    },
    orderBy: { createdAt: "asc" },
  },
  plan: {
    select: {
      assignments: {
        select: {
          enabled: true,
          feature: { select: { key: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

async function fetchPublicProduct(where: Prisma.ProductWhereUniqueInput) {
  const product = await prisma.product.findUnique({
    where,
    select: publicProductSelect,
  })

  if (!product || product.status !== "published") return null

  const fullProduct = product as PublicProduct

  const activeBadges = fullProduct.ProductBadge.filter(
    (badge: PublicProduct["ProductBadge"][number]) =>
      !badge.expiresAt || badge.expiresAt > new Date(),
  ).map((badge) => badge.badge)

  return {
    ...fullProduct,
    badges: activeBadges,
  }
}

export const getPublicProductBySlug = cached(
  async (slug: string) => fetchPublicProduct({ slug }),
  "product:public-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

export const getPublicProductMetaBySlug = cached(
  async (slug: string) => {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: publicProductMetaSelect,
    })

    if (!product || product.status !== "published") return null

    return product
  },
  "product:meta-by-slug",
  {
    ttl: 600,
    tags: ([slug]) => [TAGS.products, TAGS.product(String(slug))],
  },
)

const DEFAULT_PRODUCT_STATIC_PARAMS_LIMIT = 50
const MAX_PRODUCT_STATIC_PARAMS_LIMIT = 1000

function normalizeProductStaticParamsLimit() {
  const raw = process.env.PRODUCT_PRERENDER_LIMIT
  if (!raw) return DEFAULT_PRODUCT_STATIC_PARAMS_LIMIT

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return DEFAULT_PRODUCT_STATIC_PARAMS_LIMIT

  return Math.max(
    0,
    Math.min(Math.trunc(parsed), MAX_PRODUCT_STATIC_PARAMS_LIMIT),
  )
}

export const getProductStaticParams = cached(
  async () =>
    safelyReadStaticParams("product pages", async () => {
      const limit = normalizeProductStaticParamsLimit()
      if (limit === 0) return []

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const trafficRows = await prisma.productTrafficDaily.groupBy({
        by: ["productId"],
        where: {
          date: { gte: since },
          product: buildPublicDiscoveryProductWhere(),
        },
        _sum: {
          pageViews: true,
          uniqueVisitors: true,
        },
        orderBy: [
          { _sum: { pageViews: "desc" } },
          { _sum: { uniqueVisitors: "desc" } },
        ],
        take: limit,
      })

      const trafficProductIds = trafficRows.map((row) => row.productId)
      const trafficProducts = trafficProductIds.length
        ? await prisma.product.findMany({
            where: {
              id: { in: trafficProductIds },
              ...buildPublicDiscoveryProductWhere(),
            },
            select: { id: true, slug: true },
          })
        : []

      const slugById = new Map(
        trafficProducts.map((product) => [product.id, product.slug]),
      )
      const slugs: string[] = []
      const seen = new Set<string>()

      for (const id of trafficProductIds) {
        const slug = slugById.get(id)
        if (!slug || seen.has(slug)) continue
        seen.add(slug)
        slugs.push(slug)
      }

      const remaining = limit - slugs.length
      if (remaining > 0) {
        const fallbackProducts = await prisma.product.findMany({
          where: buildPublicDiscoveryProductWhere({
            ...(seen.size ? { slug: { notIn: Array.from(seen) } } : {}),
          }),
          orderBy: [
            { analytics: { upvotes: "desc" } },
            { publishedAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          take: remaining,
          select: { slug: true },
        })

        for (const product of fallbackProducts) {
          if (seen.has(product.slug)) continue
          seen.add(product.slug)
          slugs.push(product.slug)
        }
      }

      return slugs.map((slug) => ({ slug }))
    }),
  "products:static-params",
  {
    ttl: DEFAULT_TTL.slowest,
    tags: () => [TAGS.products, TAGS.analytics],
  },
)

const compactProductInclude = {
  analytics: {
    select: {
      upvotes: true,
    },
  },
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  verification: {
    select: {
      isVerified: true,
    },
  },
} satisfies Prisma.ProductInclude

type CompactProduct = Prisma.ProductGetPayload<{
  include: typeof compactProductInclude
}>

export const getPublicProductsByUseCase = cached(
  async (
    useCaseSlug: string,
    excludeId: string,
    limit = 6,
  ): Promise<CompactProduct[]> => {
    const effectiveLimit = Math.max(1, Math.min(limit, 12))

    const randomProductIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Product" AS p
      INNER JOIN "ProductCategory" AS pc ON pc."productId" = p.id
      INNER JOIN "UseCaseCategory" AS uc ON uc."categoryId" = pc."categoryId"
      INNER JOIN "UseCase" AS u ON u.id = uc."useCaseId"
      WHERE u.slug = ${useCaseSlug}
        AND p.status = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND p.id <> ${excludeId}
      ORDER BY RANDOM()
      LIMIT ${effectiveLimit}
    `

    if (!randomProductIds.length) {
      return []
    }

    return prisma.product.findMany({
      where: buildPublicDiscoveryProductWhere({
        id: {
          in: randomProductIds.map(({ id }: { id: string }) => id),
        },
      }),
      include: compactProductInclude,
    })
  },
  "products:public-by-usecase",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([useCaseSlug]) => [
      TAGS.products,
      TAGS.category(String(useCaseSlug)),
    ],
    keyParts: ([useCaseSlug, excludeId, limit]) => [
      `useCase:${useCaseSlug}`,
      `exclude:${excludeId}`,
      `limit:${limit ?? 6}`,
    ],
  },
)

export const getPublicProductsByCategory = cached(
  async (
    categorySlug: string,
    excludeId: string,
    limit = 6,
  ): Promise<CompactProduct[]> => {
    const effectiveLimit = Math.max(1, Math.min(limit, 12))

    const randomProductIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM (
        SELECT DISTINCT p.id
        FROM "Product" AS p
        LEFT JOIN "Category" AS primary_category
          ON primary_category.id = p."categoryId"
        LEFT JOIN "ProductCategory" AS pc
          ON pc."productId" = p.id
        LEFT JOIN "Category" AS assigned_category
          ON assigned_category.id = pc."categoryId"
        WHERE (
            primary_category.slug = ${categorySlug}
            OR assigned_category.slug = ${categorySlug}
          )
          AND p.status = 'published'
          ${buildPublicDiscoverySqlFilter("p")}
          AND p.id <> ${excludeId}
      ) AS candidates
      ORDER BY RANDOM()
      LIMIT ${effectiveLimit}
    `

    if (!randomProductIds.length) {
      return []
    }

    return prisma.product.findMany({
      where: buildPublicDiscoveryProductWhere({
        id: {
          in: randomProductIds.map(({ id }: { id: string }) => id),
        },
      }),
      include: compactProductInclude,
    })
  },
  "products:public-by-category",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([categorySlug]) => [
      TAGS.products,
      TAGS.category(String(categorySlug)),
    ],
    keyParts: ([categorySlug, excludeId, limit]) => [
      `category:${categorySlug}`,
      `exclude:${excludeId}`,
      `limit:${limit ?? 6}`,
    ],
  },
)

export async function hasUserUpvoted(productId: string, clerkId: string) {
  const user = await getActiveUserByClerkId(clerkId)
  if (!user) return false
  const { currentState } = await resolveVoteState(productId, user.id)
  return currentState === "upvoted"
}
