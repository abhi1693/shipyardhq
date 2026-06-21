import type { Metadata } from "next"

import { getBrowseProducts } from "@/actions/public/browse/actions"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import type { Platform, PricingModel, ProductType } from "@/lib/vendor/prisma/client"
import { getPlatformMeta } from "@/lib/platforms/config"
import { pricingModelValueFromSlug } from "@/lib/pricing/models"
import { productTypeValueFromSlug } from "@/lib/product-types/models"
import { buildFaqStructuredData, type FaqEntryInput } from "@/lib/seo/faq"

export const PSEO_MIN_INDEXABLE_PRODUCTS = 3

export type PseoSort = "new" | "trending" | "votes" | "az"
export type PseoSearchParamValue = string | string[] | undefined

export type PseoSearchParams = {
  sort?: PseoSearchParamValue
  verified?: PseoSearchParamValue
  page?: PseoSearchParamValue
  q?: PseoSearchParamValue
}

export type ParsedPseoSearchParams = {
  sort: PseoSort
  page: number
  verified: boolean
  query?: string
}

export type ProductSliceFilters = {
  useCaseSlug?: string
  categorySlug?: string
  platform?: Platform
  pricingModel?: PricingModel
  productType?: ProductType
  verified?: boolean
  badge?: string
  alternativeSlug?: string
}

export type ProductSlicePayload = {
  products: ProductCardBase[]
  hasMore: boolean
  total: number
}

export const pseoSortOptions = [
  { value: "new", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "votes", label: "Most Upvoted" },
  { value: "az", label: "A-Z" },
] as const

const resolveSingle = (value: PseoSearchParamValue) =>
  Array.isArray(value) ? value[0] : value

const isSort = (value?: string): PseoSort =>
  value === "trending" || value === "votes" || value === "az" ? value : "new"

export const parsePseoSearchParams = (
  params: PseoSearchParams,
): ParsedPseoSearchParams => {
  const page = Number.parseInt(resolveSingle(params.page) ?? "1", 10)
  const queryRaw = resolveSingle(params.q)

  return {
    sort: isSort(resolveSingle(params.sort)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    verified: resolveSingle(params.verified) === "true",
    query: queryRaw?.trim() ? queryRaw.trim() : undefined,
  }
}

export const buildPseoSearchParams = (params: PseoSearchParams) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) search.append(key, entry)
      })
    } else if (value) {
      search.set(key, value)
    }
  }
  return search
}

export const pseoRobotsForTotal = (total: number): Metadata["robots"] =>
  total >= PSEO_MIN_INDEXABLE_PRODUCTS
    ? undefined
    : {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      }

export async function getProductSlicePayload({
  filters,
  parsed,
  pageSize = 20,
}: {
  filters: ProductSliceFilters
  parsed: ParsedPseoSearchParams
  pageSize?: number
}): Promise<ProductSlicePayload> {
  const result = await getBrowseProducts({
    useCaseSlug: filters.useCaseSlug,
    categorySlug: filters.categorySlug,
    platform: filters.platform,
    pricingModel: filters.pricingModel,
    type: filters.productType,
    verified: filters.verified || parsed.verified,
    badge: filters.badge,
    alternativeSlug: filters.alternativeSlug,
    sort: parsed.sort,
    page: parsed.page,
    pageSize,
    query: parsed.query,
  })

  return {
    products: result.products,
    hasMore: result.hasMore,
    total: result.total ?? result.products.length,
  }
}

export const getProductSliceTotal = async (filters: ProductSliceFilters) => {
  const payload = await getProductSlicePayload({
    filters,
    parsed: {
      sort: "new",
      page: 1,
      verified: Boolean(filters.verified),
    },
    pageSize: 1,
  })

  return payload.total
}

export const platformSlugFromMaybe = (value?: string | null) =>
  getPlatformMeta(value)?.slug

export const platformValueFromMaybe = (value?: string | null) =>
  getPlatformMeta(value)?.value

export const pricingValueFromMaybe = (value?: string | null) =>
  pricingModelValueFromSlug(value)

export const productTypeValueFromMaybe = (value?: string | null) =>
  productTypeValueFromSlug(value)

export function buildDirectoryFaq({
  title,
  count,
  qualifier,
  pageUrl,
}: {
  title: string
  count: number
  qualifier: string
  pageUrl: string
}) {
  const entries: FaqEntryInput[] = [
    {
      question: `What are the best ${qualifier}?`,
      answer: `${title} lists ${count} ${count === 1 ? "product" : "products"} currently discoverable on Shipyard. The page can be sorted by newest, trending, votes, or name to compare active launches.`,
    },
    {
      question: `How does Shipyard choose ${qualifier}?`,
      answer:
        "Shipyard uses published product listings, category assignments, pricing model, platform support, badges, verification signals, and launch activity to build each directory slice.",
    },
    {
      question: "How often is this page updated?",
      answer:
        "This directory page revalidates frequently and reflects new published launches, product edits, badges, and verification changes.",
    },
  ]

  return buildFaqStructuredData(entries, { pageUrl })
}
