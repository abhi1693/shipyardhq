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
    voteCount: overrideVoteCount,
    categoryName: overrideCategoryName,
    categorySlug: overrideCategorySlug,
    createdAt: overrideCreatedAt,
    updatedAt: overrideUpdatedAt,
    isSponsored: overrideIsSponsored,
    badges: overrideBadges,
    variant: overrideVariant,
    latestMrrCents: overrideLatestMrrCents,
    mrrCurrencyCode: overrideMrrCurrencyCode,
    ...restOverrides
  } = overrides

  const voteCount =
    overrideVoteCount ??
    (typeof base.analytics?.upvotes === "number"
      ? (base.analytics.upvotes ?? 0)
      : 0)

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

  const latestMrrCents =
    typeof overrideLatestMrrCents !== "undefined"
      ? overrideLatestMrrCents
      : typeof base.latestMrrCents !== "undefined"
        ? base.latestMrrCents
        : null

  const mrrCurrencyCode =
    typeof overrideMrrCurrencyCode !== "undefined"
      ? overrideMrrCurrencyCode
      : typeof base.mrrCurrencyCode !== "undefined"
        ? base.mrrCurrencyCode
        : null

  return {
    ...base,
    badges,
    voteCount,
    categoryName,
    categorySlug,
    createdAt,
    updatedAt,
    isSponsored,
    variant,
    latestMrrCents,
    mrrCurrencyCode,
    ...restOverrides,
  }
}
