import { revalidateTag, type CacheInvalidationMode } from "./revalidateTag"
import { TAGS } from "./tags"

export function revalidateHomepage(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.homepage, mode)
}

export function revalidateBrowse(mode: CacheInvalidationMode = "update") {
  revalidateTag(TAGS.browse, mode)
}

export function revalidateCategoryDirectory(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.categoryDirectory, mode)
}

export function revalidateLeaderboardPage(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.leaderboardPage, mode)
}

export function revalidateTagsPage(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.tagsPage, mode)
}

export function revalidateProducts(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.products, mode)
  revalidateHomepage(mode)
  revalidateBrowse(mode)
  revalidateCategoryDirectory(mode)
  revalidateTagsPage(mode)
  revalidateLeaderboardPage(mode)
}

export function revalidateProduct(
  idOrSlug: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.product(idOrSlug), mode)
  revalidateProducts(mode)
}

export function revalidateProductUpdates(
  idOrSlug: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.productUpdates(idOrSlug), mode)
  revalidateProduct(idOrSlug, mode)
  revalidateTag(TAGS.productUpdatesLatest, mode)
}

export function revalidateProductUpdate(
  updateId: string,
  productIdOrSlug?: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.productUpdate(updateId), mode)
  if (productIdOrSlug) {
    revalidateProductUpdates(productIdOrSlug, mode)
  }
  revalidateTag(TAGS.productUpdatesLatest, mode)
  revalidateHomepage(mode)
  revalidateBrowse(mode)
  revalidateCategoryDirectory(mode)
  revalidateTagsPage(mode)
  revalidateLeaderboardPage(mode)
}

export function revalidateProductReviews(
  idOrSlug: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.productReview(idOrSlug), mode)
  revalidateTag(TAGS.productReviews, mode)
}

export function revalidateCategories(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.categories, mode)
  revalidateHomepage(mode)
  revalidateBrowse(mode)
  revalidateCategoryDirectory(mode)
  revalidateTagsPage(mode)
  revalidateLeaderboardPage(mode)
}

export function revalidateCategory(
  idOrSlug: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.category(idOrSlug), mode)
  revalidateCategories(mode)
}

export function revalidateLeaderboard(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.leaderboard, mode)
  revalidateTag(TAGS.trending, mode)
  revalidateTag(TAGS.analytics, mode)
  revalidateHomepage(mode)
  revalidateBrowse(mode)
  revalidateLeaderboardPage(mode)
}

export function revalidateMonthlyLeaderboard(
  monthKey?: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.monthlyLeaderboard, mode)
  if (monthKey) {
    revalidateTag(TAGS.monthlyLeaderboardMonth(monthKey), mode)
  }
  revalidateLeaderboardPage(mode)
}

export function revalidateBadges(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.badges, mode)
  revalidateTag(TAGS.featured, mode)
  revalidateProducts(mode)
}

export function revalidatePlanFeature(
  key: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.planFeature(key), mode)
  revalidateTag(TAGS.plans, mode)
  revalidateProducts(mode)
}

export function revalidatePlacement(
  featureKey: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.placement(featureKey), mode)
  revalidateProducts(mode)
}

export function revalidateUsers(mode: CacheInvalidationMode = "update") {
  revalidateTag(TAGS.users, mode)
}

export function revalidateUser(
  id: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.user(id), mode)
  revalidateUsers(mode)
}

export function revalidateRewardsLeaderboard(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.rewardsLeaderboard, mode)
  revalidateTag(TAGS.rewards, mode)
  revalidateHomepage(mode)
}
