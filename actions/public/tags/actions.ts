import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import {
  extractKeywordHash,
  keywordToSlug,
  legacyKeywordToSlug,
  normalizeKeyword,
  stripLegacyKeywordHash,
} from "@/lib/tags"
import { TAG_MIN_INDEXABLE_PRODUCTS } from "@/lib/tags/indexing"
import {
  mapProductCardRecordToBase,
  productCardSelect,
  type ProductCardRecord,
} from "@/lib/products/selects"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { getCurrentScoreMap } from "@/lib/products/leaderboard-scores"
import { getPriorityPlacementPlanIds } from "@/lib/products/priority-plans"
import { getProductInterestSignalsMap } from "@/lib/server/analytics/productInterest"

const TAG_LIST_LIMIT = 200
export const TAG_PRODUCTS_PAGE_SIZE = 24
export const TAG_DIRECTORY_DEFAULT_PAGE_SIZE = 36
const TAG_CACHE_TTL = DEFAULT_TTL.slowest

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
    SELECT
      keyword,
      MIN(canonical) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("productUpdatedAt") AS "lastUpdated"
    FROM "ProductKeyword"
    WHERE "productStatus" = 'published'
    GROUP BY keyword, hash
    HAVING COUNT(DISTINCT "productId") >= ${TAG_MIN_INDEXABLE_PRODUCTS}
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
    SELECT
      keyword,
      MIN(canonical) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("productUpdatedAt") AS "lastUpdated"
    FROM "ProductKeyword"
    WHERE "productStatus" = 'published'
    GROUP BY keyword, hash
    HAVING COUNT(DISTINCT "productId") >= ${TAG_MIN_INDEXABLE_PRODUCTS}
    ORDER BY "productCount" DESC, canonical ASC
    OFFSET ${safeOffset}
    LIMIT ${safeLimit}
  `)
  return rows
}

export async function getKeywordTagSummaries(limit: number = TAG_LIST_LIMIT) {
  "use cache"
  applyCache([TAGS.keywords], TAG_CACHE_TTL)

  const safeLimit = sanitizeTagListLimit(limit)
  const rows = await fetchKeywordTagSummaries(safeLimit)
  return rows.map(mapTagRow)
}

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

async function getKeywordTagDirectoryPageImpl({
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

export async function getKeywordTagDirectoryPage(
  params: TagDirectoryPageParams = {},
) {
  "use cache"
  applyCache([TAGS.tagsPage, TAGS.keywords], TAG_CACHE_TTL)

  return getKeywordTagDirectoryPageImpl(params)
}

async function fetchTagByHash(hash: string): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    SELECT
      keyword,
      MIN(canonical) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("productUpdatedAt") AS "lastUpdated"
    FROM "ProductKeyword"
    WHERE "productStatus" = 'published'
      AND hash = ${hash}
    GROUP BY keyword, hash
  `)
  return rows
}

async function fetchTagByCleanSlug(slug: string): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    SELECT
      keyword,
      MIN(canonical) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("productUpdatedAt") AS "lastUpdated"
    FROM "ProductKeyword"
    WHERE "productStatus" = 'published'
      AND slug = ${slug}
    GROUP BY keyword, hash
    ORDER BY COUNT(DISTINCT "productId") DESC, canonical ASC
  `)
  return rows
}

export async function getKeywordTagBySlug(slug: string) {
  "use cache"
  applyCache(
    [TAGS.keywords, slug ? TAGS.keyword(slug) : TAGS.keywords],
    TAG_CACHE_TTL,
  )

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
}

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
      "productId" AS id
    FROM "ProductKeyword"
    WHERE "productStatus" = 'published'
      AND keyword = ${normalizedKeyword}
    ORDER BY "productUpdatedAt" DESC
    OFFSET ${offset}
    LIMIT ${limit}
  `)
}

export async function getKeywordTagProducts(slug: string, page: number = 1) {
  "use cache"
  applyCache(
    [TAGS.products, TAGS.keywords, slug ? TAGS.keyword(slug) : TAGS.keywords],
    TAG_CACHE_TTL,
  )

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

  const [products, scoreMap, priorityPlanIds] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: productCardSelect,
    }),
    getCurrentScoreMap(productIds),
    getPriorityPlacementPlanIds(),
  ])

  const productMap = new Map(
    products.map((product: ProductCardRecord) => [product.id, product]),
  )
  const orderedProducts = productIds
    .map((id: string) => productMap.get(id))
    .filter(
      (product: ProductCardRecord | undefined): product is ProductCardRecord =>
        Boolean(product),
    )

  const hasMore = offset + productIds.length < total
  const now = new Date()

  const baseProducts: ProductCardBase[] = orderedProducts.map(
    (product: ProductCardRecord) =>
      mapProductCardRecordToBase(product, now, {
        scoreByProductId: scoreMap,
        priorityPlanIds,
        placementNow: now,
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
}

async function fetchKeywordTagChunk(
  offset: number,
  limit: number,
): Promise<RawTagRow[]> {
  const rows = await prisma.$queryRaw<RawTagRow[]>(Prisma.sql`
    SELECT
      keyword,
      MIN(canonical) AS canonical,
      hash,
      COUNT(DISTINCT "productId")::int AS "productCount",
      MAX("productUpdatedAt") AS "lastUpdated"
    FROM "ProductKeyword"
    WHERE "productStatus" = 'published'
    GROUP BY keyword, hash
    HAVING COUNT(DISTINCT "productId") >= ${TAG_MIN_INDEXABLE_PRODUCTS}
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
    WITH indexable_tags AS (
      SELECT
        keyword,
        hash,
        MAX("productUpdatedAt") AS "lastUpdated"
      FROM "ProductKeyword"
      WHERE "productStatus" = 'published'
      GROUP BY keyword, hash
      HAVING COUNT(DISTINCT "productId") >= ${TAG_MIN_INDEXABLE_PRODUCTS}
    )
    SELECT
      COUNT(*)::bigint AS total,
      MAX("lastUpdated") AS "lastUpdated"
    FROM indexable_tags
  `)
  return result[0] ?? { total: BigInt(0), lastUpdated: null }
}

export async function getKeywordTagSitemapStats(): Promise<{
  total: number
  lastUpdated: Date | null
}> {
  "use cache"
  applyCache([TAGS.tagsPage, TAGS.keywords], TAG_CACHE_TTL)

  const stats = await fetchKeywordTagStats()
  return {
    total: Number(stats.total ?? 0),
    lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated) : null,
  }
}

export async function getKeywordTagSitemapChunk(offset: number, limit: number) {
  "use cache"
  applyCache([TAGS.tagsPage, TAGS.keywords], TAG_CACHE_TTL)

  const safeOffset = Math.max(0, Math.trunc(offset))
  const safeLimit = Math.max(1, Math.trunc(limit))
  const rows = await fetchKeywordTagChunk(safeOffset, safeLimit)
  return rows.map(mapTagRow)
}
