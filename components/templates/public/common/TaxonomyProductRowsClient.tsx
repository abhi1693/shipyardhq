"use client"

import { useCallback, useMemo } from "react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { getProductFeedPage } from "@/actions/public/products/feedPage"
import type {
  ProductCardBase,
  ProductCardItem,
} from "@/components/molecules/ProductCard"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import { toProductCardItem } from "@/lib/products/card-item"
import {
  buildTaxonomyProductSections,
  TaxonomyProductSections,
} from "@/components/templates/public/common/TaxonomyProductRows"

const FALLBACK_TAGLINE =
  "Discover launch-ready tools from indie makers worldwide."

type TaxonomyRowsSearchParams = {
  useCase?: string
  category?: string
  verified?: boolean
  sort?: string
  q?: string
  platform?: string
  pricingModel?: string
  productType?: string
}

interface TaxonomyProductRowsClientProps {
  initialProducts: ProductCardBase[]
  initialHasMore: boolean
  initialPage: number
  referenceDateIso: string
  searchParams: TaxonomyRowsSearchParams
}

function mapProductCardItemToFeedItem(
  product: ProductCardItem,
): HomepageFeedItem {
  const categoryName =
    typeof product.categoryName !== "undefined"
      ? (product.categoryName ?? null)
      : (product.category?.name ?? null)
  const categorySlug =
    typeof product.categorySlug !== "undefined"
      ? (product.categorySlug ?? null)
      : (product.category?.slug ?? null)
  const isSponsored = Boolean(product.sponsored ?? product.isSponsored)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    logo: product.logo,
    tagline: product.tagline || FALLBACK_TAGLINE,
    createdAt: product.createdAt ?? "",
    updatedAt: product.updatedAt ?? "",
    badges: product.badges ?? [],
    category: categoryName,
    categorySlug,
    upvoteCount: product.analytics?.upvotes ?? 0,
    scoreCount: product.scoreCount,
    updatesCount: product.updatesCount,
    isSponsored,
    isVoted: Boolean(product.isVoted),
    isVerified: Boolean(product.isVerified),
    variant: product.variant ?? (isSponsored ? "sponsored" : "default"),
    interest: product.interest ?? null,
    shuffleRank: Math.random(),
  }
}

function renderSkeleton(count: number) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ProductFeedCardSkeleton key={`taxonomy-row-skeleton-${index}`} />
      ))}
    </div>
  )
}

export function TaxonomyProductRowsClient({
  initialProducts,
  initialHasMore,
  initialPage,
  referenceDateIso,
  searchParams,
}: TaxonomyProductRowsClientProps) {
  const initialItems = useMemo(
    () => initialProducts.map((product) => toProductCardItem(product)),
    [initialProducts],
  )

  const normalizedSearch = useMemo(
    () => ({
      useCase: searchParams.useCase,
      category: searchParams.category,
      verified: searchParams.verified,
      sort: searchParams.sort,
      q: searchParams.q,
      platform: searchParams.platform,
      pricingModel: searchParams.pricingModel,
      productType: searchParams.productType,
    }),
    [
      searchParams.category,
      searchParams.platform,
      searchParams.pricingModel,
      searchParams.productType,
      searchParams.q,
      searchParams.sort,
      searchParams.useCase,
      searchParams.verified,
    ],
  )

  const resetKey = useMemo(
    () => JSON.stringify(normalizedSearch),
    [normalizedSearch],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const result = await getProductFeedPage({
        kind: "browse",
        page,
        ...normalizedSearch,
      })

      return {
        items: result.items.map((item) => toProductCardItem(item)),
        hasMore: result.hasMore,
      }
    },
    [normalizedSearch],
  )

  const renderItems = useCallback(
    (items: ProductCardItem[]) => {
      const feedItems = items.map((item) => mapProductCardItemToFeedItem(item))
      return (
        <TaxonomyProductSections
          sections={buildTaxonomyProductSections(feedItems, referenceDateIso)}
        />
      )
    },
    [referenceDateIso],
  )

  return (
    <InfiniteProductGrid
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      initialPage={initialPage}
      loadPage={loadPage}
      resetKey={resetKey}
      loadingSkeletonCount={3}
      renderItems={renderItems}
      renderLoadingSkeleton={renderSkeleton}
      endMessage={
        <p className="py-4 text-center text-sm text-[#43474c]">
          You&apos;ve reached the end of this directory.
        </p>
      }
    />
  )
}
