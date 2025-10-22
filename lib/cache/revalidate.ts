import { revalidateTag as nextRevalidateTag } from "next/cache"
import { TAGS } from "./tags"

const REVALIDATE_PROFILE = "max" as const

function revalidateTag(tag: string) {
  nextRevalidateTag(tag, REVALIDATE_PROFILE)
}

export function revalidateHomepage() {
  revalidateTag(TAGS.homepage)
}

export function revalidateBrowse() {
  revalidateTag(TAGS.browse)
}

export function revalidateCategoryDirectory() {
  revalidateTag(TAGS.categoryDirectory)
}

export function revalidateLeaderboardPage() {
  revalidateTag(TAGS.leaderboardPage)
}

export function revalidateTagsPage() {
  revalidateTag(TAGS.tagsPage)
}

export function revalidateProducts() {
  revalidateTag(TAGS.products)
  revalidateHomepage()
  revalidateBrowse()
  revalidateCategoryDirectory()
  revalidateTagsPage()
  revalidateLeaderboardPage()
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
  revalidateBrowse()
  revalidateCategoryDirectory()
  revalidateTagsPage()
  revalidateLeaderboardPage()
}

export function revalidateProductReviews(idOrSlug: string) {
  revalidateTag(TAGS.productReview(idOrSlug))
  revalidateTag(TAGS.productReviews)
}

export function revalidateCategories() {
  revalidateTag(TAGS.categories)
  revalidateHomepage()
  revalidateBrowse()
  revalidateCategoryDirectory()
  revalidateTagsPage()
  revalidateLeaderboardPage()
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
  revalidateBrowse()
  revalidateLeaderboardPage()
}

export function revalidateMonthlyLeaderboard(monthKey?: string) {
  revalidateTag(TAGS.monthlyLeaderboard)
  if (monthKey) {
    revalidateTag(TAGS.monthlyLeaderboardMonth(monthKey))
  }
  revalidateLeaderboardPage()
}

export function revalidateBadges() {
  revalidateTag(TAGS.badges)
  revalidateTag(TAGS.featured)
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
