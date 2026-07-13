import Link from "next/link"

import type { ProductCategorySummary } from "@/lib/products/categories"
import { PUBLIC_PRODUCT_CATEGORY_LIMIT } from "@/lib/products/categories"
import { categoryPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

type ProductCategoryPillsProps = {
  categories?: readonly ProductCategorySummary[] | null
  className?: string
  pillClassName?: string
  linkClassName?: string
  linkCategories?: boolean
  emptyLabel?: string
}

export function ProductCategoryPills({
  categories,
  className,
  pillClassName,
  linkClassName,
  linkCategories = true,
  emptyLabel,
}: ProductCategoryPillsProps) {
  const visibleCategories = (categories ?? []).slice(
    0,
    PUBLIC_PRODUCT_CATEGORY_LIMIT,
  )

  if (!visibleCategories.length && !emptyLabel) return null

  return (
    <span
      role="group"
      aria-label="Categories"
      className={cn("inline-flex flex-wrap items-center gap-2", className)}
    >
      {visibleCategories.length ? (
        visibleCategories.map((category) => {
          const categoryClassName = cn(
            "inline-flex items-center rounded-full border border-border/60 bg-neutral-100 px-3 py-1 text-xs font-semibold text-foreground",
            pillClassName,
          )

          return linkCategories && category.slug ? (
            <Link
              key={category.slug}
              href={categoryPath(category.slug)}
              className={cn(
                categoryClassName,
                "transition hover:text-[#0051d5]",
                linkClassName,
              )}
            >
              {category.name}
            </Link>
          ) : (
            <span
              key={category.slug ?? category.name}
              className={categoryClassName}
            >
              {category.name}
            </span>
          )
        })
      ) : (
        <span className={cn("text-xs text-muted-foreground", pillClassName)}>
          {emptyLabel}
        </span>
      )}
    </span>
  )
}
