import { getProducts } from "@/actions/public/products/featured"
import { LatestLaunches } from "@/components/organisms/LatestLaunches"
import { DirectorySectionHeaderSkeleton } from "@/components/molecules/directory/SectionHeader.skeleton"
import ProductListSkeleton from "@/components/molecules/ProductList.skeleton"

export async function LatestLaunchesSection() {
  const products = await getProducts("new", 1000)
  return <LatestLaunches products={products} />
}

export function LatestLaunchesSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeaderSkeleton descriptionLines={2} />
      <div className="mt-8">
        <ProductListSkeleton count={4} />
      </div>
    </section>
  )
}
