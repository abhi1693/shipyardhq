"use client"

import { Badge } from "@/components/atoms/badge"
import ProductList from "@/components/molecules/ProductList"
import { cn } from "@/lib/utils"

type BaseProductListItem = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  badges?: string[]
  analytics?: { upvotes?: number | null } | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  category?: { name?: string | null } | null
  verification?: { isVerified?: boolean | null } | null
}

type BadgeMetaConfig = {
  type: "badge"
  defaultLabel?: string
  badgeClassName?: string
}

type RankMetaConfig = {
  type: "rank"
  start?: number
  badgeClassName?: string
}

type MetaConfig = BadgeMetaConfig | RankMetaConfig

interface DirectoryProductListProps<
  T extends BaseProductListItem & { metaLabel?: string }
> {
  items: T[]
  columns?: string
  showCategory?: boolean
  metaConfig?: MetaConfig
  showBadges?: boolean
}

export function DirectoryProductList<
  T extends BaseProductListItem & { metaLabel?: string }
>({
  items,
  columns,
  showCategory = true,
  metaConfig,
  showBadges = false,
}: DirectoryProductListProps<T>) {
  const topRight = metaConfig
    ? (item: T, index: number) => {
        if (metaConfig.type === "badge") {
          const label = item.metaLabel ?? metaConfig.defaultLabel
          if (!label) return null
          return (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-semibold",
                metaConfig.badgeClassName ??
                  "border-muted-foreground/30 bg-muted/70 text-muted-foreground",
              )}
            >
              {label}
            </Badge>
          )
        }

        const start = metaConfig.start ?? 0
        return (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              metaConfig.badgeClassName ??
                "border-primary/40 bg-primary/8 text-primary",
            )}
          >
            #{start + index + 1}
          </Badge>
        )
      }
    : undefined

  return (
    <ProductList
      items={items}
      columns={columns}
      showCategory={showCategory}
      topRight={topRight}
      showBadges={showBadges}
    />
  )
}
