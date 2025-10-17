import type { ProductUpdateFeedItem } from "@/types/product-updates"

/**
 * Selects a balanced set of product updates while keeping the original order.
 * Prioritizes showing each product once before repeating to improve fairness.
 */
export function selectBalancedProductUpdates(
  updates: ProductUpdateFeedItem[],
  limit: number,
): ProductUpdateFeedItem[] {
  if (!Number.isFinite(limit) || limit <= 0) return []
  if (updates.length <= limit) return updates.slice(0, limit)

  const selected: ProductUpdateFeedItem[] = []
  const seenProductIds = new Set<string>()
  const seenUpdateIds = new Set<string>()

  for (const update of updates) {
    if (!update?.product?.id) continue
    if (seenProductIds.has(update.product.id)) continue
    selected.push(update)
    seenProductIds.add(update.product.id)
    seenUpdateIds.add(update.id)
    if (selected.length === limit) return selected
  }

  if (selected.length < limit) {
    for (const update of updates) {
      if (selected.length === limit) break
      if (seenUpdateIds.has(update.id)) continue
      selected.push(update)
      seenUpdateIds.add(update.id)
    }
  }

  return selected.slice(0, limit)
}
