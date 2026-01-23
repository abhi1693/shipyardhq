import type {
  ProductCardBase,
  ProductCardItem,
} from "@/components/molecules/ProductCard"

const coerceDate = (value?: string | Date | null): string | undefined => {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : value
}

export const toProductCardItem = (
  base: ProductCardBase,
  overrides: Partial<ProductCardItem> = {},
): ProductCardItem => {
  const {
    scoreCount: overrideScoreCount,
    categoryName: overrideCategoryName,
    categorySlug: overrideCategorySlug,
    createdAt: overrideCreatedAt,
    updatedAt: overrideUpdatedAt,
    isSponsored: overrideIsSponsored,
    badges: overrideBadges,
    variant: overrideVariant,
    latestRevenueCents: overrideLatestRevenueCents,
    revenueCurrencyCode: overrideRevenueCurrencyCode,
    isVerified: overrideIsVerified,
    ...restOverrides
  } = overrides

  const scoreCount =
    typeof overrideScoreCount !== "undefined"
      ? overrideScoreCount
      : typeof base.scoreCount !== "undefined"
        ? base.scoreCount
        : undefined

  const categoryName =
    typeof overrideCategoryName !== "undefined"
      ? overrideCategoryName
      : typeof base.category?.name !== "undefined"
        ? (base.category?.name ?? null)
        : null

  const categorySlug =
    typeof overrideCategorySlug !== "undefined"
      ? overrideCategorySlug
      : typeof base.category?.slug !== "undefined"
        ? (base.category?.slug ?? null)
        : null

  const badges = overrideBadges ?? base.badges ?? []

  const createdAt = overrideCreatedAt ?? coerceDate(base.createdAt)
  const updatedAt = overrideUpdatedAt ?? coerceDate(base.updatedAt)

  const isSponsored =
    typeof overrideIsSponsored !== "undefined"
      ? overrideIsSponsored
      : Boolean(base.sponsored)

  const variant =
    typeof overrideVariant !== "undefined"
      ? overrideVariant
      : isSponsored
        ? "sponsored"
        : "default"

  const isVerified = Boolean(
    typeof overrideIsVerified !== "undefined"
      ? overrideIsVerified
      : base.isVerified,
  )

  const latestRevenueCents =
    typeof overrideLatestRevenueCents !== "undefined"
      ? overrideLatestRevenueCents
      : typeof base.latestRevenueCents !== "undefined"
        ? base.latestRevenueCents
        : null

  const revenueCurrencyCode =
    typeof overrideRevenueCurrencyCode !== "undefined"
      ? overrideRevenueCurrencyCode
      : typeof base.revenueCurrencyCode !== "undefined"
        ? base.revenueCurrencyCode
        : null

  return {
    ...base,
    badges,
    scoreCount,
    categoryName,
    categorySlug,
    createdAt,
    updatedAt,
    isSponsored,
    variant,
    isVerified,
    latestRevenueCents,
    revenueCurrencyCode,
    ...restOverrides,
  }
}
