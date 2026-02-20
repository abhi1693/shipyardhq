"use client"

import { useCallback, useMemo } from "react"

import ProductGrid from "@/components/molecules/ProductGrid"
import { EmptyState } from "@/components/molecules/empty-state"
import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { getVerifiedRevenueProductsApiV1PublicVerifiedRevenueProductsGet } from "@/lib/generated/fastapi/public-homepage"
import type { HomepageFeedItem } from "@/lib/generated/fastapi/schemas"

interface VerifiedRevenueGridClientProps {
  initialProducts: ProductCardBase[]
  initialHasMore: boolean
  initialPage: number
  total: number
  pageSize: number
}

const toProductCardBase = (item: HomepageFeedItem): ProductCardBase => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  logo: item.logo ?? "",
  tagline: item.tagline ?? "",
  badges: item.badges ?? [],
  category:
    item.category || item.categorySlug
      ? {
          name: item.category ?? null,
          slug: item.categorySlug ?? null,
        }
      : null,
  sponsored: item.isSponsored,
  isVerified: item.isVerified,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  latestRevenueCents:
    typeof item.latestRevenueCents === "number" ? item.latestRevenueCents : null,
  revenueCurrencyCode: item.revenueCurrencyCode ?? null,
  scoreCount:
    typeof item.scoreCount === "number" ? item.scoreCount : undefined,
  interest: item.interest ?? null,
})

export function VerifiedRevenueGridClient({
  initialProducts,
  initialHasMore,
  initialPage,
  total,
  pageSize,
}: VerifiedRevenueGridClientProps) {
  const renderRankMeta = useCallback(
    (rank: number) => (
      <span className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-xs font-semibold text-[color:var(--brand-1)]">
        #{rank.toLocaleString()}
      </span>
    ),
    [],
  )

  const initialItems = useMemo(
    () =>
      initialProducts.map((product, index) =>
        toProductCardItem(product, { meta: renderRankMeta(index + 1) }),
      ),
    [initialProducts, renderRankMeta],
  )

  const loadPage = useCallback(
    async (page: number) => {
      const response = await getVerifiedRevenueProductsApiV1PublicVerifiedRevenueProductsGet(
        {
          page,
          pageSize,
        },
      )
      if (response.status !== 200) {
        return { items: [], hasMore: false }
      }

      const result = response.data
      const baseItems = (result.items ?? []).map(toProductCardBase)
      const startRank = (page - 1) * pageSize + 1

      return {
        items: baseItems.map((item, index) =>
          toProductCardItem(item, { meta: renderRankMeta(startRank + index) }),
        ),
        hasMore: Boolean(result.hasMore),
      }
    },
    [pageSize, renderRankMeta],
  )

  const endMessage = useMemo(() => {
    if (!total) return null
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Showing all {total.toLocaleString()} revenue verified products.
      </p>
    )
  }, [total])

  const resetKey = useMemo(
    () =>
      [
        total,
        pageSize,
        initialProducts[0]?.id ?? "none",
        initialProducts[0]?.latestRevenueCents ?? "0",
      ].join(":"),
    [initialProducts, pageSize, total],
  )

  return (
    <ProductGrid
      items={initialItems}
      infinite={{
        hasMore: initialHasMore,
        initialPage,
        loadPage,
        resetKey,
        loadingSkeletonCount: pageSize,
        sentinelMargin: "0px 0px 360px 0px",
      }}
      emptyState={
        <EmptyState
          title="No revenue verified products yet"
          description="Once teams connect their payment provider, their products will show up here with verified revenue."
        />
      }
      endMessage={endMessage}
    />
  )
}
