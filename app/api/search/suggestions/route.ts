import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"
import { BROWSE_PATH, productPath } from "@/lib/routes"
import { cacheGetOrSet } from "@/lib/server/cache"
import { buildSearchSuggestionsCacheKey } from "@/lib/server/search/suggestions-cache"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"

const MIN_QUERY_LENGTH = 2
const PRODUCT_LIMIT = 8
const CACHE_TTL_SECONDS = 60
const IN_PROCESS_TTL_MS = 15_000

export type SearchSuggestion = {
  id: string
  type: "product"
  label: string
  description: string
  href: string
  image: string | null
  meta: string | null
}

function normalizeQuery(value: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
}

function browseSearchPath(query: string): string {
  if (!query) return BROWSE_PATH

  const params = new URLSearchParams({ q: query })
  return `${BROWSE_PATH}?${params.toString()}`
}

async function loadSuggestions(query: string): Promise<SearchSuggestion[]> {
  const tokens = query.split(/[\s,]+/).filter(Boolean)
  const tokensLower = tokens.map((token) => token.toLowerCase())

  const products = await prisma.product.findMany({
    where: buildPublicDiscoveryProductWhere({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { tagline: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        {
          category: {
            is: { name: { contains: query, mode: "insensitive" } },
          },
        },
        ...(tokens.length ? [{ keywords: { hasSome: tokens } }] : []),
        ...(tokensLower.length ? [{ keywords: { hasSome: tokensLower } }] : []),
        { keywords: { has: query } },
      ],
    }),
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      logo: true,
      category: { select: { name: true } },
      analytics: { select: { upvotes: true } },
    },
    orderBy: [{ analytics: { upvotes: "desc" } }, { publishedAt: "desc" }],
    take: PRODUCT_LIMIT,
  })

  return products.map((product): SearchSuggestion => {
    const meta = [product.category?.name].filter(Boolean).join(" / ")

    return {
      id: product.id,
      type: "product",
      label: product.name,
      description: product.tagline,
      href: productPath(product.slug),
      image: product.logo,
      meta: meta || null,
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = normalizeQuery(searchParams.get("q"))

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { items: [], browseHref: browseSearchPath(query) },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    )
  }

  const items = await cacheGetOrSet({
    key: buildSearchSuggestionsCacheKey(query),
    ttlSeconds: CACHE_TTL_SECONDS,
    inProcessTtlMs: IN_PROCESS_TTL_MS,
    loader: () => loadSuggestions(query),
  })

  return NextResponse.json(
    { items, browseHref: browseSearchPath(query) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  )
}
