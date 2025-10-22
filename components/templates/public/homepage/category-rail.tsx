import { getTopCategories } from "@/actions/public/products/featured"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { Skeleton } from "@/components/atoms/skeleton"
import { HOMEPAGE_CATEGORY_RAIL_LIMIT } from "./constants"

export async function CategoryRailSection() {
  const categories = await getTopCategories(HOMEPAGE_CATEGORY_RAIL_LIMIT)
  return <DirectoryCategoryRail categories={categories} />
}

export function CategoryRailSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: HOMEPAGE_CATEGORY_RAIL_LIMIT }).map(
          (_, index) => (
            <Skeleton key={index} className="h-10 rounded-2xl" />
          ),
        )}
      </div>
    </section>
  )
}
