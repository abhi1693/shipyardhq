import { EmptyState } from "@/components/molecules/empty-state"
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
  referenceDateIso: string
  searchParams: ProductGridSearchParams
  emptyTitle: string
  emptyDescription?: string
}

export function TaxonomyProductGridFeed({
  products,
  hasMore,
  initialPage,
  referenceDateIso,
  searchParams,
  emptyTitle,
  emptyDescription = "Check back soon or explore everything in browse.",
}: TaxonomyProductGridFeedProps) {
  return (
    <>
      {products.length === 0 ? (
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel="Visit browse"
            actionHref={BROWSE_PATH}
          />
        </div>
      ) : (
        <TaxonomyProductRowsClient
          initialProducts={products}
          initialHasMore={hasMore}
          initialPage={initialPage}
          referenceDateIso={referenceDateIso}
          searchParams={searchParams}
        />
      )}
    </>
  )
}
