"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useMemo } from "react"
import { ArrowUp, BadgeCheck, ImageIcon, Sparkles } from "lucide-react"

import { getProductFeedPage } from "@/actions/public/products/feedPage"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import ProductFeedCardSkeleton from "@/components/molecules/ProductFeedCard.skeleton"
import type {
  ProductCardBase,
  ProductCardItem,
} from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { categoryPath, productPath } from "@/lib/routes"

type BrowseRowsSearchParams = {
  useCase?: string
  category?: string
  sort?: string
  q?: string
  platform?: string
  pricingModel?: string
  productType?: string
  minPrice?: number
  maxPrice?: number
  badge?: string
  backlinkVerified?: boolean
}

interface BrowseProductRowsClientProps {
  initialProducts: ProductCardBase[]
  initialHasMore: boolean
  initialPage: number
  searchParams: BrowseRowsSearchParams
}

function ProductLogo({ product }: { product: ProductCardItem }) {
  if (!product.logo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eff4ff] text-[#74777d]">
        <ImageIcon className="h-6 w-6" aria-hidden />
      </div>
    )
  }

  return (
    <Image
      src={product.logo}
      alt={`${product.name} logo`}
      fill
      sizes="56px"
      className="object-cover"
    />
  )
}

function BrowseProductRow({ product }: { product: ProductCardItem }) {
  const href = productPath(product.slug)
  const categoryName = product.categoryName ?? product.category?.name ?? null
  const categorySlug = product.categorySlug ?? product.category?.slug ?? null
  const score =
    typeof product.scoreCount === "number" &&
    Number.isFinite(product.scoreCount)
      ? product.scoreCount
      : 0
  const badges = product.badges ?? []

  return (
    <article className="group flex items-center gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#10b981] hover:shadow-lg">
      <Link
        href={href}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#eff4ff]"
      >
        <ProductLogo product={product} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={href}
            className="truncate text-lg font-semibold text-[#061d31] transition group-hover:text-[#0051d5]"
          >
            {product.name}
          </Link>
          {product.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#eff6ff] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#0051d5]">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              Verified
            </span>
          ) : null}
          {product.isSponsored || product.sponsored ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#f97316]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Sponsored
            </span>
          ) : badges.length ? (
            <span className="rounded bg-[#10b981]/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#047857]">
              {badges[0]}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-1 text-sm text-[#43474c]">
          {product.tagline ||
            "Discover launch-ready tools from indie makers worldwide."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {categoryName ? (
            categorySlug ? (
              <Link
                href={categoryPath(categorySlug)}
                className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#43474c] transition hover:bg-[#0051d5]/10 hover:text-[#0051d5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
              >
                {categoryName}
              </Link>
            ) : (
              <span className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#43474c]">
                {categoryName}
              </span>
            )
          ) : null}
        </div>
      </div>
      <Link
        href={href}
        className="flex shrink-0 flex-col items-center gap-1 rounded-lg bg-[#f8fafc] px-4 py-2 text-[#43474c] transition group-hover:bg-[#eff6ff] group-hover:text-[#0051d5] active:scale-95"
        aria-label={`View ${product.name}, score ${score.toLocaleString("en-US")}`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
        <span className="text-sm font-bold leading-none">
          {score.toLocaleString("en-US")}
        </span>
      </Link>
    </article>
  )
}

function renderLoadingSkeleton(count: number) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ProductFeedCardSkeleton key={`browse-row-skeleton-${index}`} />
      ))}
    </div>
  )
}

export function BrowseProductRowsClient({
  initialProducts,
  initialHasMore,
  initialPage,
  searchParams,
}: BrowseProductRowsClientProps) {
  const initialItems = useMemo(
    () => initialProducts.map((product) => toProductCardItem(product)),
    [initialProducts],
  )

  const normalizedSearch = useMemo(
    () => ({
      useCase: searchParams.useCase,
      category: searchParams.category,
      sort: searchParams.sort,
      q: searchParams.q,
      platform: searchParams.platform,
      pricingModel: searchParams.pricingModel,
      productType: searchParams.productType,
      minPrice: searchParams.minPrice,
      maxPrice: searchParams.maxPrice,
      badge: searchParams.badge,
      backlinkVerified: searchParams.backlinkVerified,
    }),
    [
      searchParams.category,
      searchParams.badge,
      searchParams.backlinkVerified,
      searchParams.maxPrice,
      searchParams.minPrice,
      searchParams.platform,
      searchParams.pricingModel,
      searchParams.productType,
      searchParams.q,
      searchParams.sort,
      searchParams.useCase,
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

  return (
    <InfiniteProductGrid
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      initialPage={initialPage}
      loadPage={loadPage}
      resetKey={resetKey}
      loadingSkeletonCount={3}
      renderItems={(items) => (
        <div className="space-y-3">
          {items.map((item) => (
            <BrowseProductRow key={item.id} product={item} />
          ))}
        </div>
      )}
      renderLoadingSkeleton={renderLoadingSkeleton}
      endMessage={
        <p className="py-4 text-center text-sm text-[#43474c]">
          You&apos;ve reached the end of the directory.
        </p>
      }
    />
  )
}
