type LoadPageResult<R> = {
  items: R[]
  hasMore: boolean
}

export interface StaticPagerOptions<T, R> {
  pageSize: number
  mapItem: (item: T, absoluteIndex: number) => R
}

export interface StaticPagerResult<R> {
  initialItems: R[]
  initialHasMore: boolean
  loadPage: (page: number) => Promise<LoadPageResult<R>>
  totalPages: number
}

export function createStaticProductPager<T, R>(
  items: T[],
  { pageSize, mapItem }: StaticPagerOptions<T, R>,
): StaticPagerResult<R> {
  const safePageSize = Math.max(1, pageSize)
  const chunks: R[][] = []

  items.forEach((item, index) => {
    const chunkIndex = Math.floor(index / safePageSize)
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = []
    }
    chunks[chunkIndex].push(mapItem(item, index))
  })

  const initialItems = chunks[0] ?? []
  const initialHasMore = chunks.length > 1

  const loadPage = async (page: number): Promise<LoadPageResult<R>> => {
    const target = Math.max(0, page - 1)
    const nextItems = chunks[target] ?? []
    const hasMore = target + 1 < chunks.length
    return { items: nextItems, hasMore }
  }

  return {
    initialItems,
    initialHasMore,
    loadPage,
    totalPages: chunks.length,
  }
}
