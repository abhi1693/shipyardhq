"use client"

import { useCallback, useMemo } from "react"
import type { ComponentProps } from "react"

import { Badge } from "@/components/atoms/badge"
import ProductGrid from "@/components/molecules/ProductGrid"
import type { ProductCardItem } from "@/components/molecules/ProductCard"
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
  metaConfig?: MetaConfig
  pageSize?: number
  className?: string
  sentinelMargin?: string
}

export function DirectoryProductList<T extends BaseProductListItem>({
  items,
  columns: _columns,
  metaConfig,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
  sentinelMargin,
}: DirectoryProductListProps<T>) {
  void _columns
  const chunkSize = Math.max(1, pageSize)

  const renderMeta = useMemo(() => {
    if (!metaConfig) return undefined
    if (metaConfig.type === "badge") {
      const badgeConfig = metaConfig
      function renderBadgeMeta(item: T) {
        const label = item.metaLabel ?? badgeConfig.defaultLabel
        if (!label) return null
        return (
          <Badge
            variant={badgeConfig.badgeVariant ?? "outline"}
            className={cn(
              "rounded-full px-3 py-0.5 text-xs font-semibold",
              badgeConfig.badgeClassName ??
                "border-muted-foreground/30 bg-muted/70 text-muted-foreground",
            )}
          >
            {label}
          </Badge>
        )
      }
      return renderBadgeMeta
    }

    const rankConfig = metaConfig
    const start = rankConfig.start ?? 0
    function renderRankMeta(_item: T, index: number) {
      return (
        <Badge
          variant={rankConfig.badgeVariant ?? "outline"}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            rankConfig.badgeClassName ??
              "border-primary/40 bg-primary/8 text-primary",
          )}
        >
          #{start + index + 1}
        </Badge>
      )
    }
    return renderRankMeta
  }, [metaConfig])

  const chunks = useMemo(() => {
    const result: T[][] = []
    for (let index = 0; index < items.length; index += chunkSize) {
      result.push(items.slice(index, index + chunkSize))
    }
    return result
  }, [items, chunkSize])

  const initialHasMore = chunks.length > 1

  const mapToCardItem = useCallback(
    (item: T, absoluteIndex: number): ProductCardItem => ({
      ...item,
      voteCount: item.analytics?.upvotes ?? 0,
      categoryName: item.category?.name ?? null,
      meta: renderMeta ? renderMeta(item, absoluteIndex) : undefined,
      isSponsored: item.sponsored ?? false,
    }),
    [renderMeta],
  )

  const initialCardItems = useMemo(() => {
    const firstChunk = chunks[0] ?? []
    return firstChunk.map((item, index) => mapToCardItem(item, index))
  }, [chunks, mapToCardItem])

  const loadPage = useCallback(
    async (page: number) => {
      const targetIndex = page - 1
      const nextItems = chunks[targetIndex] ?? []
      const hasMore = targetIndex + 1 < chunks.length
      const startIndex = targetIndex * chunkSize
      return {
        items: nextItems.map((item, index) =>
          mapToCardItem(item, startIndex + index),
        ),
        hasMore,
      }
    },
    [chunkSize, chunks, mapToCardItem],
  )

  const resetKey = useMemo(
    () =>
      items.map((item) => `${item.id}:${item.metaLabel ?? ""}`).join("|") +
      `:pageSize:${chunkSize}`,
    [chunkSize, items],
  )

  const listClassName = useMemo(
    () => cn("space-y-4", className),
    [className],
  )

  return (
    <ProductGrid
      items={initialCardItems}
      className={listClassName}
      infinite={{
        hasMore: initialHasMore,
        initialPage: 2,
        loadPage,
        resetKey,
        loadingSkeletonCount: chunkSize,
        sentinelMargin,
      }}
      emptyState={null}
      endMessage={null}
    />
  )
}
