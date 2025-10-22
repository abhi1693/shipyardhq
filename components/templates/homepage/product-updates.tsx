import { getLatestPublicProductUpdates } from "@/actions/public/product-updates/actions"
import { ProductUpdatesFeed } from "@/components/molecules/ProductUpdatesFeed"
import { Skeleton } from "@/components/atoms/skeleton"

export async function ProductUpdatesSection() {
  const updates = await getLatestPublicProductUpdates(6)
  return <ProductUpdatesFeed updates={updates} />
}

export function ProductUpdatesSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-2 h-6 w-48" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-5 h-4 w-40" />
    </section>
  )
}
