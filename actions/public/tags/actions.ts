import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  extractKeywordHash,
  keywordToSlug,
  legacyKeywordToSlug,
  normalizeKeyword,
  stripLegacyKeywordHash,
} from "@/lib/tags"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"
import { buildPublicDiscoverySqlFilter } from "@/lib/products/public-discovery"

const TAG_LIST_LIMIT = 200
export const TAG_PRODUCTS_PAGE_SIZE = 24
export const TAG_DIRECTORY_DEFAULT_PAGE_SIZE = 36

function sanitizeTagListLimit(limit?: number): number {
  const normalized = Math.trunc(limit ?? TAG_LIST_LIMIT) || TAG_LIST_LIMIT
  return Math.min(Math.max(normalized, 1), TAG_LIST_LIMIT)
}

function sanitizePageNumber(page?: number): number {
  const normalized = Math.trunc(page ?? 1)
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 1
  }
  return normalized
}

interface RawTagRow {
  keyword: string
  canonical: string
  hash: string
  productCount: number
  lastUpdated: Date | null
}

export interface KeywordTagSummary {
  keyword: string
  canonical: string
  hash: string
  slug: string
  productCount: number
  lastUpdated: Date | null
}

function mapTagRow(row: RawTagRow): KeywordTagSummary {
  const keyword = row.keyword
  return {
    keyword,
    canonical: row.canonical,
    hash: row.hash,
    slug: keywordToSlug(keyword),
    productCount: Number(row.productCount) || 0,
    lastUpdated: row.lastUpdated ? new Date(row.lastUpdated) : null,
  }
}

async function fetchKeywordTagSummaries(limit: number): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    WITH expanded AS (
      SELECT
        LOWER(TRIM(k)) AS keyword,
        TRIM(k) AS raw_keyword,
        SUBSTRING(md5(LOWER(TRIM(k))), 1, 6) AS hash,
        p."id" AS "productId",
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt") AS "updatedAt"
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."keywords") AS k
      WHERE
        p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND k IS NOT NULL
        AND TRIM(k) <> ''
    )
    SELECT
      keyword,
      MIN(raw_keyword) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("updatedAt") AS "lastUpdated"
    FROM expanded
    GROUP BY keyword, hash
    ORDER BY "productCount" DESC, canonical ASC
    LIMIT ${limit}
  `)
  return rows
}

async function fetchKeywordTagSummariesPage(
  offset: number,
  limit: number,
): Promise<RawTagRow[]> {
  const safeOffset = Math.max(0, Math.trunc(offset))
  const safeLimit = Math.max(1, Math.trunc(limit))

  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    WITH expanded AS (
      SELECT
        LOWER(TRIM(k)) AS keyword,
        TRIM(k) AS raw_keyword,
        SUBSTRING(md5(LOWER(TRIM(k))), 1, 6) AS hash,
        p."id" AS "productId",
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt") AS "updatedAt"
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."keywords") AS k
      WHERE
        p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND k IS NOT NULL
        AND TRIM(k) <> ''
    )
    SELECT
      keyword,
      MIN(raw_keyword) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("updatedAt") AS "lastUpdated"
    FROM expanded
    GROUP BY keyword, hash
    ORDER BY "productCount" DESC, canonical ASC
    OFFSET ${safeOffset}
    LIMIT ${safeLimit}
  `)
  return rows
}

export const getKeywordTagSummaries = cached(
  async (limit: number = TAG_LIST_LIMIT) => {
    const safeLimit = sanitizeTagListLimit(limit)
    const rows = await fetchKeywordTagSummaries(safeLimit)
    return rows.map(mapTagRow)
  },
  "tags:summaries",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => [TAGS.keywords],
    keyParts: ([limit]) => [String(sanitizeTagListLimit(limit))],
  },
)

export interface TagDirectoryPageParams {
  page?: number
  pageSize?: number
  includeTotal?: boolean
}

export interface TagDirectoryPageResult {
  items: KeywordTagSummary[]
  hasMore: boolean
  total?: number
}

export async function getKeywordTagDirectoryPage({
  page = 1,
  pageSize = TAG_DIRECTORY_DEFAULT_PAGE_SIZE,
  includeTotal = false,
}: TagDirectoryPageParams = {}): Promise<TagDirectoryPageResult> {
  const safePage = sanitizePageNumber(page)
  const safePageSize = sanitizeTagListLimit(pageSize)
  const queryLimit = Math.min(TAG_LIST_LIMIT, safePageSize + 1)
  const offset = Math.max(0, (safePage - 1) * safePageSize)

  const [rows, stats] = await Promise.all([
    fetchKeywordTagSummariesPage(offset, queryLimit),
    includeTotal ? fetchKeywordTagStats() : Promise.resolve(null),
  ])

  const summaries = rows.slice(0, safePageSize).map(mapTagRow)
  const hasMore = rows.length > safePageSize
  const total =
    includeTotal && stats
      ? Number(stats.total ?? 0)
      : includeTotal
        ? 0
        : undefined

  return {
    items: summaries,
    hasMore,
    total,
  }
}

async function fetchTagByHash(hash: string): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    WITH expanded AS (
      SELECT
        LOWER(TRIM(k)) AS keyword,
        TRIM(k) AS raw_keyword,
        SUBSTRING(md5(LOWER(TRIM(k))), 1, 6) AS hash,
        p."id" AS "productId",
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt") AS "updatedAt"
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."keywords") AS k
      WHERE
        p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND k IS NOT NULL
        AND TRIM(k) <> ''
    )
    SELECT
      keyword,
      MIN(raw_keyword) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("updatedAt") AS "lastUpdated"
    FROM expanded
    WHERE hash = ${hash}
    GROUP BY keyword, hash
  `)
  return rows
}

async function fetchTagByCleanSlug(slug: string): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    WITH expanded AS (
      SELECT
        LOWER(TRIM(k)) AS keyword,
        TRIM(k) AS raw_keyword,
        SUBSTRING(md5(LOWER(TRIM(k))), 1, 6) AS hash,
        REGEXP_REPLACE(
          REGEXP_REPLACE(LOWER(TRIM(k)), '[^a-z0-9]+', '-', 'g'),
          '(^-|-$)',
          '',
          'g'
        ) AS slug,
        p."id" AS "productId",
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt") AS "updatedAt"
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."keywords") AS k
      WHERE
        p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND k IS NOT NULL
        AND TRIM(k) <> ''
    )
    SELECT
      keyword,
      MIN(raw_keyword) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("updatedAt") AS "lastUpdated"
    FROM expanded
    WHERE slug = ${slug}
    GROUP BY keyword, hash
    ORDER BY COUNT(DISTINCT "productId") DESC, canonical ASC
  `)
  return rows
}

export const getKeywordTagBySlug = cached(
  async (slug: string) => {
    const hash = extractKeywordHash(slug)
    if (hash) {
      const rows = await fetchTagByHash(hash)
      for (const row of rows) {
        const summary = mapTagRow(row)
        if (
          summary.slug === stripLegacyKeywordHash(slug) ||
          legacyKeywordToSlug(summary.keyword) === slug
        ) {
          return summary
        }
      }
      return null
    }

    const cleanSlug = stripLegacyKeywordHash(slug)
    const rows = await fetchTagByCleanSlug(cleanSlug)
    for (const row of rows) {
      const summary = mapTagRow(row)
      if (summary.slug === cleanSlug) {
        return summary
      }
    }
    return null
  },
  "tags:by-slug",
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([slug]) => [
      TAGS.keywords,
      slug ? TAGS.keyword(slug) : TAGS.keywords,
    ],
    keyParts: ([slug]) => [slug],
  },
)

export interface KeywordTagProductsResult {
  summary: KeywordTagSummary
  products: ProductCardBase[]
  total: number
  hasMore: boolean
}

async function fetchProductIdsByKeyword(
  normalizedKeyword: string,
  offset: number,
  limit: number,
) {
  return prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT
      p."id" AS id
    FROM "Product" p
    WHERE
      p."status" = 'published'
      ${buildPublicDiscoverySqlFilter("p")}
      AND EXISTS (
        SELECT 1
        FROM UNNEST(p."keywords") AS keyword
        WHERE LOWER(TRIM(keyword)) = ${normalizedKeyword}
      )
    ORDER BY COALESCE(p."updatedAt", p."publishedAt", p."createdAt") DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `)
}

export const getKeywordTagProducts = cached(
  async (slug: string, page: number = 1) => {
    const summary = await getKeywordTagBySlug(slug)
    if (!summary) {
      return null
    }

    const normalized = normalizeKeyword(summary.keyword).toLowerCase()
    const offset = (Math.max(page, 1) - 1) * TAG_PRODUCTS_PAGE_SIZE

    const ids = await fetchProductIdsByKeyword(
      normalized,
      offset,
      TAG_PRODUCTS_PAGE_SIZE,
    )
    const total = summary.productCount

    const productIds = ids.map((row: { id: string }) => row.id)
    if (productIds.length === 0) {
      return {
        summary,
        products: [],
        total,
        hasMore: false,
      } satisfies KeywordTagProductsResult
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: productCardSelect,
    })
    const scoreMap = await getCurrentScoreMap(productIds)

    const productMap = new Map(
      products.map((product: ProductCardRecord) => [product.id, product]),
    )
    const orderedProducts = productIds
      .map((id: string) => productMap.get(id))
      .filter(
        (
          product: ProductCardRecord | undefined,
        ): product is ProductCardRecord => Boolean(product),
      )

    const hasMore = offset + productIds.length < total

    const baseProducts: ProductCardBase[] = orderedProducts.map(
      (product: ProductCardRecord) =>
        mapProductCardRecordToBase(product, new Date(), {
          scoreByProductId: scoreMap,
        }),
    )

    const interestMap = await getProductInterestSignalsMap({
      products: baseProducts.map((product) => ({
        id: product.id,
        slug: product.slug,
      })),
    })

    return {
      summary,
      products: baseProducts.map((product) => ({
        ...product,
        interest: interestMap.get(product.id) ?? null,
      })),
      total,
      hasMore,
    }
  },
  "tags:products-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) => [
      TAGS.products,
      TAGS.keywords,
      slug ? TAGS.keyword(slug) : TAGS.keywords,
    ],
    keyParts: ([slug, page]) => [slug, String(page ?? 1)],
  },
)

async function fetchKeywordTagChunk(
  offset: number,
  limit: number,
): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    WITH expanded AS (
      SELECT
        LOWER(TRIM(k)) AS keyword,
        TRIM(k) AS raw_keyword,
        SUBSTRING(md5(LOWER(TRIM(k))), 1, 6) AS hash,
        p."id" AS "productId",
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt") AS "updatedAt"
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."keywords") AS k
      WHERE
        p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND k IS NOT NULL
        AND TRIM(k) <> ''
    )
    SELECT
      keyword,
      MIN(raw_keyword) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("updatedAt") AS "lastUpdated"
    FROM expanded
    GROUP BY keyword, hash
    ORDER BY canonical ASC
    OFFSET ${offset}
    LIMIT ${limit}
  `)
  return rows
}

async function fetchKeywordTagStats() {
  const result = await prisma.$queryRaw<
    { total: bigint; lastUpdated: Date | null }[]
  >(Prisma.sql`
    WITH expanded AS (
      SELECT
        LOWER(TRIM(k)) AS keyword,
        COALESCE(p."updatedAt", p."publishedAt", p."createdAt") AS "updatedAt"
      FROM "Product" p
      CROSS JOIN LATERAL UNNEST(p."keywords") AS k
      WHERE
        p."status" = 'published'
        ${buildPublicDiscoverySqlFilter("p")}
        AND k IS NOT NULL
        AND TRIM(k) <> ''
    ),
    grouped AS (
      SELECT
        keyword,
        MAX("updatedAt") AS "lastUpdated"
      FROM expanded
      GROUP BY keyword
    )
    SELECT
      COUNT(*)::bigint AS total,
      MAX("lastUpdated") AS "lastUpdated"
    FROM grouped
  `)
  return result[0] ?? { total: BigInt(0), lastUpdated: null }
}

export async function getKeywordTagSitemapStats(): Promise<{
  total: number
  lastUpdated: Date | null
}> {
  const stats = await fetchKeywordTagStats()
  return {
    total: Number(stats.total ?? 0),
    lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated) : null,
  }
}

export async function getKeywordTagSitemapChunk(offset: number, limit: number) {
  const rows = await fetchKeywordTagChunk(offset, limit)
  return rows.map(mapTagRow)
}
