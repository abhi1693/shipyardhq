import { ReactNode } from "react"
import UniformCard from "@/components/molecules/UniformCard"
import { ProductCard } from "@/components/molecules/ProductCard"
import { FeaturedProduct } from "@/types"
import { cn } from "@/lib/utils"

export function FeaturedProductGrid({
  items,
  filterExpiredBadges = true,
  extra,
  className,
  columns = "grid-cols-1 items-stretch sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
}: {
  items: FeaturedProduct[]
  filterExpiredBadges?: boolean
  extra?: ReactNode
  className?: string
  columns?: string
}) {
  const now = new Date()
  return (
    <div className={cn("grid gap-5", columns, className)}>
      {items.map(({ product, id }) => {
        const p = product
        const badges = filterExpiredBadges
          ? p.ProductBadge.filter(
              (pb) => !pb.expiresAt || new Date(pb.expiresAt) > now,
            ).map((pb) => pb.badge)
          : p.ProductBadge.map((pb) => pb.badge)

        return (
          <UniformCard key={id} size="normal">
            <ProductCard
              product={{
                id: p.id,
                slug: p.slug,
                name: p.name,
                logo: p.logo,
                tagline: p.tagline,
              }}
              badges={badges}
              upvotes={p.analytics?.upvotes ?? 0}
              author={
                p.user
                  ? {
                      name: `${p.user.firstName ?? ""} ${
                        p.user.lastName ?? ""
                      }`.trim(),
                      initial: p.user.firstName?.[0] ?? "U",
                    }
                  : /* c8 ignore next */ undefined
              }
              category={p.category?.name}
            />
          </UniformCard>
        )
      })}
      {extra ? <UniformCard size="normal">{extra}</UniformCard> : null}
    </div>
  )
}

export default FeaturedProductGrid
