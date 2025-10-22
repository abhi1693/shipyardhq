import { beforeEach, describe, expect, it, vi } from "vitest"

const revalidateTagMock = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}))

import {
  revalidateBadges,
  revalidateCategories,
  revalidateCategory,
  revalidateBrowse,
  revalidateCategoryDirectory,
  revalidateHomepage,
  revalidateLeaderboard,
  revalidateLeaderboardPage,
  revalidateMonthlyLeaderboard,
  revalidatePlanFeature,
  revalidateProduct,
  revalidateProducts,
  revalidateTagsPage,
  revalidateRewardsLeaderboard,
} from "@/lib/cache/revalidate"
import { REVALIDATE_PROFILE } from "@/lib/cache/revalidateTag"

beforeEach(() => {
  revalidateTagMock.mockClear()
})

function expectRevalidateTags(...tags: string[]) {
  expect(revalidateTagMock.mock.calls).toEqual(
    tags.map((tag) => [tag, REVALIDATE_PROFILE]),
  )
}

describe("revalidate helpers", () => {
  it("revalidates products collection", () => {
    revalidateProducts()
    expectRevalidateTags(
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })

  it("revalidates individual product and collection", () => {
    revalidateProduct("product-1")
    expectRevalidateTags(
      "product:product-1",
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })

  it("revalidates category and categories", () => {
    revalidateCategory("category-2")
    expectRevalidateTags(
      "category:category-2",
      "categories",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })

  it("revalidates categories collection", () => {
    revalidateCategories()
    expectRevalidateTags(
      "categories",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })

  it("revalidates leaderboard family", () => {
    revalidateLeaderboard()
    expectRevalidateTags(
      "leaderboard",
      "trending",
      "analytics",
      "homepage",
      "browse",
      "leaderboard:page",
    )
  })

  it("revalidates monthly leaderboard tags with month key", () => {
    revalidateMonthlyLeaderboard("30-04-2024")
    expectRevalidateTags(
      "leaderboard:monthly",
      "leaderboard:monthly:30-04-2024",
      "leaderboard:page",
    )
  })

  it("revalidates monthly leaderboard base tag when no key provided", () => {
    revalidateMonthlyLeaderboard()
    expectRevalidateTags("leaderboard:monthly", "leaderboard:page")
  })

  it("revalidates badges and products", () => {
    revalidateBadges()
    expectRevalidateTags(
      "badges",
      "featured",
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })

  it("revalidates plan feature and associated entities", () => {
    revalidatePlanFeature("analytics.advanced")
    expectRevalidateTags(
      "plan-feature:analytics.advanced",
      "plans",
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })

  it("revalidates homepage directly", () => {
    revalidateHomepage()
    expectRevalidateTags("homepage")
  })

  it("revalidates browse directly", () => {
    revalidateBrowse()
    expectRevalidateTags("browse")
  })

  it("revalidates category directory directly", () => {
    revalidateCategoryDirectory()
    expectRevalidateTags("categories:directory")
  })

  it("revalidates tags page directly", () => {
    revalidateTagsPage()
    expectRevalidateTags("tags:page")
  })

  it("revalidates leaderboard page directly", () => {
    revalidateLeaderboardPage()
    expectRevalidateTags("leaderboard:page")
  })

  it("revalidates rewards leaderboard with homepage", () => {
    revalidateRewardsLeaderboard()
    expectRevalidateTags("rewards:leaderboard", "rewards", "homepage")
  })
})
