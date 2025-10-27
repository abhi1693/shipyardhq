"use client"

import { useCallback, useMemo } from "react"
import type { ComponentProps } from "react"

import { Badge } from "@/components/atoms/badge"
import InfiniteProductGrid from "@/components/molecules/InfiniteProductGrid"
import type { CompactProductItem } from "@/components/molecules/ProductCompactGrid"
import { cn } from "@/lib/utils"

type BaseProductListItem = CompactProductItem & {
  badges?: string[]
  metaLabel?: string
}

const DEFAULT_PAGE_SIZE = 12

type BadgeVariant = ComponentProps<typeof Badge>["variant"]

type BadgeMetaConfig = {
  type: "badge"
  defaultLabel?: string
  badgeClassName?: string
  badgeVariant?: BadgeVariant
}

type RankMetaConfig = {
  type: "rank"
  start?: number
  badgeClassName?: string
  badgeVariant?: BadgeVariant
}

type MetaConfig = BadgeMetaConfig | RankMetaConfig

interface DirectoryProductListProps<T extends BaseProductListItem> {
  items: T[]
  columns?: string
  showCategory?: boolean
  metaConfig?: MetaConfig
  showBadges?: boolean
  pageSize?: number
  className?: string
  sentinelMargin?: string
}

export function DirectoryProductList<T extends BaseProductListItem>({
  items,
  columns,
  showCategory = true,
  metaConfig,
  showBadges = false,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
  sentinelMargin,
}: DirectoryProductListProps<T>) {
  const chunkSize = Math.max(1, pageSize)

  const chunks = useMemo(() => {
    const result: T[][] = []
    for (let index = 0; index < items.length; index += chunkSize) {
      result.push(items.slice(index, index + chunkSize))
    }
    return result
  }, [items, chunkSize])

  const initialItems = chunks[0] ?? []
  const initialHasMore = chunks.length > 1

  const loadPage = useCallback(
    async (page: number) => {
      const targetIndex = page - 1
      const nextItems = chunks[targetIndex] ?? []
      const hasMore = targetIndex + 1 < chunks.length
      return {
        items: nextItems,
        hasMore,
      }
    },
    [chunks],
  )

  const resetKey = useMemo(
    () =>
      items.map((item) => `${item.id}:${item.metaLabel ?? ""}`).join("|") +
      `:pageSize:${chunkSize}`,
    [chunkSize, items],
  )

  const renderMeta = useMemo(() => {
    if (!metaConfig) return undefined
    if (metaConfig.type === "badge") {
      function renderBadgeMeta(item: T) {
        const label = item.metaLabel ?? metaConfig.defaultLabel
        if (!label) return null
        return (
          <Badge
            variant={metaConfig.badgeVariant ?? "outline"}
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
      return renderBadgeMeta
    }

    const start = metaConfig.start ?? 0
    function renderRankMeta(_item: T, index: number) {
      return (
        <Badge
          variant={metaConfig.badgeVariant ?? "outline"}
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
    return renderRankMeta
  }, [metaConfig])

  return (
    <InfiniteProductGrid
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      initialPage={2}
      loadPage={loadPage}
      resetKey={resetKey}
      loadingSkeletonCount={chunkSize}
      endMessage={null}
      emptyState={null}
      gridOverrides={{
        columns,
        renderMeta,
        showCategory,
        showBadges,
        className,
      }}
      sentinelMargin={sentinelMargin}
    />
  )
}
