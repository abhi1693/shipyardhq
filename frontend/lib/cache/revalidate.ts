import { revalidateTag, type CacheInvalidationMode } from "./revalidateTag"
import { TAGS } from "./tags"

export function revalidateHomepage(mode: CacheInvalidationMode = "update") {
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

export function revalidateTagsPage(mode: CacheInvalidationMode = "update") {
  revalidateTag(TAGS.tagsPage, mode)
}

export function revalidateProducts(mode: CacheInvalidationMode = "update") {
  revalidateTag(TAGS.products, mode)
  revalidateHomepage(mode)
  revalidateBrowse(mode)
  revalidateCategoryDirectory(mode)
  revalidateTagsPage(mode)
  revalidateLeaderboardPage(mode)
}

export function revalidateAlternativeProducts(
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.alternativeProducts, mode)
}

export function revalidateAlternativeProduct(
  id: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.alternativeProduct(id), mode)
  revalidateAlternativeProducts(mode)
  revalidateProducts(mode)
}

export function revalidateProduct(
  idOrSlug: string,
  mode: CacheInvalidationMode = "update",
) {
  revalidateTag(TAGS.product(idOrSlug), mode)
  revalidateProducts(mode)
}

export function revalidateCategories(mode: CacheInvalidationMode = "update") {
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

export function revalidateLeaderboard(mode: CacheInvalidationMode = "update") {
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

export function revalidateBadges(mode: CacheInvalidationMode = "update") {
  revalidateTag(TAGS.badges, mode)
  revalidateTag(TAGS.featured, mode)
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
