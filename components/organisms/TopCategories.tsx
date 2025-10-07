import Link from "next/link"

import { cn } from "@/lib/utils"
import { categoryPath } from "@/lib/routes"

type CategoryWithCount = {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  _count?: {
    products: number
  }
  count?: number
}

interface TopCategoriesProps {
  categories: CategoryWithCount[]
  limit?: number
  className?: string
  title?: string
  description?: string
}

export function TopCategories({
  categories,
  limit = 6,
  className,
  title = "Categories to watch",
  description = "The Shipyard community spends the most time exploring these areas of the directory right now.",
}: TopCategoriesProps) {
  const nonEmpty = categories
    .map((category) => ({
      ...category,
      productCount:
        category._count?.products ??
        (typeof category.count === "number" ? category.count : 0),
    }))
    .filter((category) => category.productCount > 0)
    .slice(0, limit)

  if (nonEmpty.length === 0) return null

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-white px-6 py-6 shadow-sm md:px-8",
        className,
      )}
    >
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Most-viewed categories
        </span>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <ol className="mt-5 space-y-3">
        {nonEmpty.map((category, index) => (
          <li key={category.id}>
            <Link
              href={categoryPath(category.slug)}
              className="group flex items-start justify-between gap-4 rounded-2xl border border-border/60 px-4 py-3 transition hover:border-border hover:bg-muted/40"
            >
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="text-xs font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span className="transition-colors group-hover:text-foreground">
                    {category.name}
                  </span>
                </div>
                {category.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {category.description}
                  </p>
                ) : null}
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {category.productCount} launch
                {category.productCount === 1 ? "" : "es"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
