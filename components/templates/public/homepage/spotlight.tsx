import HomepageSpotlight from "@/components/organisms/HomepageSpotlight"
import { Skeleton } from "@/components/atoms/skeleton"
import { getHomepageFeatureProducts } from "@/actions/public/products/featured"

export async function HomepageSpotlightSection() {
  const placements = await getHomepageFeatureProducts(12)
  return <HomepageSpotlight placements={placements} />
}

export function HomepageSpotlightSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-4 h-8 w-80" />
      <Skeleton className="mt-2 h-4 w-full" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}
