import { getProducts } from "@/actions/public/products/featured"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import { DirectoryProductListSkeleton } from "@/components/organisms/directory/DirectoryProductList.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export async function FeaturedHighlightsSection() {
  const products = await getProducts("featured")
  return <FeaturedHighlights products={products} />
}

export function FeaturedHighlightsSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeaderSkeleton descriptionLines={2} withAction />
      <div className="mt-8 space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
          <DirectoryProductListSkeleton
            count={4}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            showMetaBadge
          />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
          <DirectoryProductListSkeleton
            count={4}
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          />
        </div>
      </div>
    </section>
  )
}
