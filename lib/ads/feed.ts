type ProductPromotion = {
  sponsored?: boolean
  isSponsored?: boolean
  variant?: string
}

type FeedNeighbors = {
  before?: readonly ProductPromotion[]
  after?: readonly ProductPromotion[]
}

export const MIN_PRODUCTS_BETWEEN_PROMOTIONS = 3

function isSponsoredProduct(product: ProductPromotion) {
  return Boolean(
    product.sponsored ||
    product.isSponsored ||
    product.variant === "sponsored" ||
    product.variant === "promoted",
  )
}

export function canPlaceFeedAdAfter(
  products: readonly ProductPromotion[],
  index: number,
  { before = [], after = [] }: FeedNeighbors = {},
) {
  if (index < 0 || index >= products.length) return false
  const gap = MIN_PRODUCTS_BETWEEN_PROMOTIONS
  const preceding = products.slice(Math.max(0, index - gap + 1), index + 1)
  const following = products.slice(index + 1, index + 1 + gap)
  // Look across section headings too: a heading alone does not separate ads.
  const nearby = [
    ...(preceding.length < gap ? before.slice(-(gap - preceding.length)) : []),
    ...preceding,
    ...following,
    ...(following.length < gap ? after.slice(0, gap - following.length) : []),
  ]
  return !nearby.some(isSponsoredProduct)
}

export function feedAdIndex(
  products: readonly ProductPromotion[],
  neighbors: FeedNeighbors = {},
) {
  // Prefer the earliest position with three regular products between Carbon and
  // each paid placement. If there is not enough room, retain the sponsor alone.
  return products.findIndex((_, index) =>
    canPlaceFeedAdAfter(products, index, neighbors),
  )
}
