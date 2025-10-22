import { getProducts } from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import { ProductCompactGridSkeleton } from "@/components/molecules/ProductCompactGrid.skeleton"

export async function LatestLaunchesSection() {
  const products = await getProducts("new", 1000)
  return <LatestLaunches products={products} />
}

export function LatestLaunchesSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeaderSkeleton descriptionLines={2} />
      <div className="mt-8">
        <ProductCompactGridSkeleton
          count={4}
          columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        />
      </div>
    </section>
  )
}
