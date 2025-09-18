import { ReactNode } from "react"
import { ProductCompactCard } from "@/components/molecules/ProductCompactCard"
import { cn } from "@/lib/utils"

export type CompactProductItem = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  analytics?: { upvotes?: number | null } | null
  category?: { name?: string | null } | null
}

interface ProductCompactGridProps<T extends CompactProductItem> {
  items: T[]
  className?: string
  columns?: string
  imagePriorityFirstN?: number
  renderMeta?: (item: T, index: number) => ReactNode
  showCategory?: boolean
}

export function ProductCompactGrid<T extends CompactProductItem>({
  items,
  className,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  imagePriorityFirstN = 6,
  renderMeta,
  showCategory = true,
}: ProductCompactGridProps<T>) {
  return (
    <div
      className={cn("grid gap-5", columns, className)}
      data-testid="product-compact-grid"
    >
      {items.map((item, index) => (
        <ProductCompactCard
          key={item.id}
          product={{
            id: item.id,
            slug: item.slug,
            name: item.name,
            logo: item.logo,
            tagline: item.tagline,
          }}
          upvotes={item.analytics?.upvotes ?? 0}
          category={item.category?.name ?? null}
          imagePriority={index < imagePriorityFirstN}
          meta={renderMeta?.(item, index)}
          showCategory={showCategory}
        />
      ))}
    </div>
  )
}

export default ProductCompactGrid
