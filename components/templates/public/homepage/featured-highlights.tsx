import { getProducts } from "@/actions/public/products/featured"
import { FeaturedHighlights } from "@/components/organisms/FeaturedHighlights"
import { Skeleton } from "@/components/atoms/skeleton"

export async function FeaturedHighlightsSection() {
  const products = await getProducts("featured")
  return <FeaturedHighlights products={products} />
}

export function FeaturedHighlightsSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}
