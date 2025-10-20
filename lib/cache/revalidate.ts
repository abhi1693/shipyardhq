import { revalidateTag } from "next/cache"
import { TAGS } from "./tags"

export function revalidateHomepage() {
  revalidateTag(TAGS.homepage)
}

export function revalidateProducts() {
  revalidateTag(TAGS.products)
  revalidateHomepage()
}

export function revalidateProduct(idOrSlug: string) {
  revalidateTag(TAGS.product(idOrSlug))
  revalidateProducts()
}

export function revalidateProductUpdates(idOrSlug: string) {
  revalidateTag(TAGS.productUpdates(idOrSlug))
  revalidateProduct(idOrSlug)
  revalidateTag(TAGS.productUpdatesLatest)
}

export function revalidateProductUpdate(
  updateId: string,
  productIdOrSlug?: string,
) {
  revalidateTag(TAGS.productUpdate(updateId))
  if (productIdOrSlug) {
    revalidateProductUpdates(productIdOrSlug)
  }
  revalidateTag(TAGS.productUpdatesLatest)
  revalidateHomepage()
}

export function revalidateProductReviews(idOrSlug: string) {
  revalidateTag(TAGS.productReview(idOrSlug))
  revalidateTag(TAGS.productReviews)
}

export function revalidateCategories() {
  revalidateTag(TAGS.categories)
  revalidateHomepage()
}

export function revalidateCategory(idOrSlug: string) {
  revalidateTag(TAGS.category(idOrSlug))
  revalidateCategories()
}

export function revalidateLeaderboard() {
  revalidateTag(TAGS.leaderboard)
  revalidateTag(TAGS.trending)
  revalidateTag(TAGS.analytics)
  revalidateHomepage()
}

export function revalidateMonthlyLeaderboard(monthKey?: string) {
  revalidateTag(TAGS.monthlyLeaderboard)
  if (monthKey) {
    revalidateTag(TAGS.monthlyLeaderboardMonth(monthKey))
  }
}

export function revalidateBadges() {
  revalidateTag(TAGS.badges)
  revalidateProducts()
}

export function revalidatePlanFeature(key: string) {
  revalidateTag(TAGS.planFeature(key))
  revalidateTag(TAGS.plans)
  revalidateProducts()
}

export function revalidatePlacement(featureKey: string) {
  revalidateTag(TAGS.placement(featureKey))
  revalidateProducts()
}

export function revalidateRewardsLeaderboard() {
  revalidateTag(TAGS.rewardsLeaderboard)
  revalidateTag(TAGS.rewards)
  revalidateHomepage()
}
