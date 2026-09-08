import Link from "next/link"

import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { TaxonomyProductRowsClient } from "@/components/templates/public/common/TaxonomyProductRowsClient"
import { BROWSE_PATH } from "@/lib/routes"

type ProductGridSearchParams = {
  useCase?: string
  category?: string
  verified?: boolean
  sort?: string
  q?: string
  platform?: string
  pricingModel?: string
  productType?: string
}

interface TaxonomyProductGridFeedProps {
  products: ProductCardBase[]
  hasMore: boolean
  initialPage: number
  pageSize?: number
  referenceDateIso?: string | null
  searchParams: ProductGridSearchParams
  emptyTitle: string
  emptyDescription?: string
}

export function TaxonomyProductGridFeed({
  products,
  hasMore,
  initialPage,
  pageSize,
  referenceDateIso,
  searchParams,
  emptyTitle,
  emptyDescription = "Check back soon or explore everything in browse.",
}: TaxonomyProductGridFeedProps) {
  return (
    <>
      {products.length === 0 ? (
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-semibold text-black">{emptyTitle}</h3>
            <p className="mt-2 max-w-md text-sm text-[#43474c]">
              {emptyDescription}
            </p>
            <Link
              href={BROWSE_PATH}
              className="mt-6 inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_28px_-18px_rgba(7,78,134,0.45)] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.35]"
            >
              Visit browse
            </Link>
          </div>
        </div>
      ) : (
        <TaxonomyProductRowsClient
          initialProducts={products}
          initialHasMore={hasMore}
          initialPage={initialPage}
          pageSize={pageSize}
          referenceDateIso={referenceDateIso}
          searchParams={searchParams}
        />
      )}
    </>
  )
}
