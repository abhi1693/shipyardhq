import Link from "next/link"

import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { categoryPath } from "@/lib/routes"

interface CategoryWithCount {
  id: string
  name: string
  slug: string
  icon?: string | null
  description?: string | null
  _count: {
    products: number
  }
}

interface DirectoryCategoryRailProps {
  categories: CategoryWithCount[]
}

export function DirectoryCategoryRail({
  categories,
}: DirectoryCategoryRailProps) {
  const visibleCategories = categories.filter(
    (category) => (category?._count?.products ?? 0) > 0,
  )

  if (!visibleCategories.length) {
    return null
  }

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Browse by top categories
        </h3>
        <p className="text-sm text-muted-foreground">
          Quick jumps into the busiest categories on Shipyard. Use them as
          starting points before dialing in filters on the full directory.
        </p>
      </div>
      <ul className="space-y-3">
        {visibleCategories.map((category) => (
          <li key={category.id}>
            <Link
              href={categoryPath(category.slug)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-border/70 hover:bg-muted/60"
            >
              <span className="flex items-center gap-3">
                {category.icon ? (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-lg">
                    <CategoryIcon icon={category.icon} size={20} />
                  </span>
                ) : null}
                <span className="line-clamp-1">{category.name}</span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {category._count.products.toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
