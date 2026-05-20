export function stableUnitInterval(seed: string) {
  let hash = 2166136261

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 0xffffffff
}

export function pickWeightedBySeed<T>(
  items: readonly T[],
  seed: string,
  getWeight: (item: T) => number,
): T | null {
  if (!items.length) return null

  const weighted = items
    .map((item) => ({
      item,
      weight: Math.max(0, Number(getWeight(item) ?? 1)),
    }))
    .filter((entry) => entry.weight > 0)

  if (!weighted.length) return items[0] ?? null

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  const pick = stableUnitInterval(seed) * totalWeight
  let cursor = 0

  for (const entry of weighted) {
    cursor += entry.weight
    if (pick < cursor) return entry.item
  }

  return weighted.at(-1)?.item ?? items[0] ?? null
}
