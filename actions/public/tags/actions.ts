import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
import {
  extractKeywordHash,
  keywordToSlug,
  normalizeKeyword,
} from "@/lib/tags"

const TAG_LIST_LIMIT = 200
export const TAG_PRODUCTS_PAGE_SIZE = 24

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

export const getKeywordTagSummaries = cached(
  async (limit: number = TAG_LIST_LIMIT) => {
    const rows = await fetchKeywordTagSummaries(limit)
    return rows.map(mapTagRow)
  },
  "tags:summaries",
  {
    ttl: DEFAULT_TTL.slow,
    tags: () => accelerateTags([TAGS.keywords]),
    keyParts: ([limit]) => [String(limit)],
  },
)

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

export const getKeywordTagBySlug = cached(
  async (slug: string) => {
    const hash = extractKeywordHash(slug)
    if (!hash) return null
    const rows = await fetchTagByHash(hash)
    for (const row of rows) {
      const summary = mapTagRow(row)
      if (summary.slug === slug) {
        return summary
      }
    }
    return null
  },
  "tags:by-slug",
  {
    ttl: DEFAULT_TTL.slow,
    tags: ([slug]) =>
      accelerateTags([
        TAGS.keywords,
        slug ? TAGS.keyword(slug) : TAGS.keywords,
      ]),
    keyParts: ([slug]) => [slug],
  },
)

export interface KeywordTagProductsResult {
  summary: KeywordTagSummary
  products: CompactTagProduct[]
  total: number
  hasMore: boolean
}

type CompactTagProduct = Prisma.ProductGetPayload<{
  select: {
    id: true
    slug: true
    name: true
    logo: true
    tagline: true
    analytics: { select: { upvotes: true } }
    category: { select: { name: true } }
  }
}>

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

    const productIds = ids.map((row) => row.id)
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
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        tagline: true,
        analytics: { select: { upvotes: true } },
        category: { select: { name: true } },
      },
      cacheStrategy: {
        ttl: DEFAULT_TTL.medium,
        swr: DEFAULT_SWR.medium,
        tags: accelerateTags([
          TAGS.products,
          TAGS.keywords,
          TAGS.keyword(slug),
        ]),
      },
    })

    const productMap = new Map(products.map((product) => [product.id, product]))
    const orderedProducts = productIds
      .map((id) => productMap.get(id))
      .filter((product): product is CompactTagProduct => Boolean(product))

    const hasMore = offset + productIds.length < total

    return {
      summary,
      products: orderedProducts,
      total,
      hasMore,
    }
  },
  "tags:products-by-slug",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([slug]) =>
      accelerateTags([
        TAGS.products,
        TAGS.keywords,
        slug ? TAGS.keyword(slug) : TAGS.keywords,
      ]),
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

export async function getKeywordTagSitemapChunk(
  offset: number,
  limit: number,
) {
  const rows = await fetchKeywordTagChunk(offset, limit)
  return rows.map(mapTagRow)
}
