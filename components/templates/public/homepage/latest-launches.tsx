import { getProducts } from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { Skeleton } from "@/components/atoms/skeleton"

export async function LatestLaunchesSection() {
  const products = await getProducts("new", 1000)
  return <LatestLaunches products={products} />
}

export function LatestLaunchesSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <Skeleton className="h-6 w-52" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
    </section>
  )
}
