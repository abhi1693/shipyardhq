import { getTopCategories } from "@/actions/public/products/featured"
import { DirectoryCategoryRail } from "@/components/organisms/directory/CategoryRail"
import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { HOMEPAGE_CATEGORY_RAIL_LIMIT } from "./constants"

export async function CategoryRailSection() {
  const categories = await getTopCategories(HOMEPAGE_CATEGORY_RAIL_LIMIT)
  return <DirectoryCategoryRail categories={categories} />
}

export function CategoryRailSkeleton() {
  return (
    <Skeleton
      tone="soft"
      radius="lg"
      shimmer={false}
      className="rounded-3xl border border-border bg-white p-6 shadow-sm"
    >
      <HeadingSkeleton className="max-w-xl" lines={2} />
      <div className="mt-6 flex flex-wrap gap-3">
        {Array.from({ length: HOMEPAGE_CATEGORY_RAIL_LIMIT }).map(
          (_, index) => (
            <BadgeSkeleton
              key={index}
              variant="outline"
              labelWidth="6rem"
              leadingIcon
              className="h-9"
            />
          ),
        )}
      </div>
    </Skeleton>
  )
}
