import { beforeEach, describe, expect, it, vi } from "vitest"

const revalidateTagMock = vi.hoisted(() => vi.fn())
const updateTagMock = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
  updateTag: updateTagMock,
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
  revalidateUser,
  revalidateUsers,
  revalidateRewardsLeaderboard,
} from "@/lib/cache/revalidate"
import { REVALIDATE_PROFILE } from "@/lib/cache/revalidateTag"

beforeEach(() => {
  revalidateTagMock.mockClear()
  updateTagMock.mockClear()
})

function expectRevalidateTags(...tags: string[]) {
  expect(revalidateTagMock.mock.calls).toEqual(
    tags.map((tag) => [tag, REVALIDATE_PROFILE]),
  )
}

function expectUpdateTags(...tags: string[]) {
  expect(updateTagMock.mock.calls).toEqual(tags.map((tag) => [tag]))
}

describe("revalidate helpers", () => {
  it("revalidates products collection", () => {
    revalidateProducts("revalidate")
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
    revalidateProduct("product-1", "revalidate")
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
    revalidateCategory("category-2", "revalidate")
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
    revalidateCategories("revalidate")
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
    revalidateLeaderboard("revalidate")
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
    revalidateMonthlyLeaderboard("30-04-2024", "revalidate")
    expectRevalidateTags(
      "leaderboard:monthly",
      "leaderboard:monthly:30-04-2024",
      "leaderboard:page",
    )
  })

  it("revalidates monthly leaderboard base tag when no key provided", () => {
    revalidateMonthlyLeaderboard(undefined, "revalidate")
    expectRevalidateTags("leaderboard:monthly", "leaderboard:page")
  })

  it("revalidates users collection", () => {
    revalidateUsers("revalidate")
    expectRevalidateTags("users")
  })

  it("revalidates individual user and collection", () => {
    revalidateUser("user-1", "revalidate")
    expectRevalidateTags("user:user-1", "users")
  })

  it("revalidates badges and products", () => {
    revalidateBadges("revalidate")
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
    revalidatePlanFeature("analytics.advanced", "revalidate")
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
    revalidateHomepage("revalidate")
    expectRevalidateTags("homepage")
  })

  it("revalidates browse directly", () => {
    revalidateBrowse("revalidate")
    expectRevalidateTags("browse")
  })

  it("revalidates category directory directly", () => {
    revalidateCategoryDirectory("revalidate")
    expectRevalidateTags("categories:directory")
  })

  it("revalidates tags page directly", () => {
    revalidateTagsPage("revalidate")
    expectRevalidateTags("tags:page")
  })

  it("revalidates leaderboard page directly", () => {
    revalidateLeaderboardPage("revalidate")
    expectRevalidateTags("leaderboard:page")
  })

  it("revalidates rewards leaderboard with homepage", () => {
    revalidateRewardsLeaderboard("revalidate")
    expectRevalidateTags("rewards:leaderboard", "rewards", "homepage")
  })

  it("uses updateTag by default", () => {
    revalidateProducts()

    expectUpdateTags(
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it("falls back to revalidate when updateTag is unavailable", () => {
    updateTagMock.mockImplementation(() => {
      throw new Error("updateTag can only be called inside a Server Action")
    })

    revalidateProducts()

    expectUpdateTags(
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
    expectRevalidateTags(
      "products",
      "homepage",
      "browse",
      "categories:directory",
      "tags:page",
      "leaderboard:page",
    )
  })
})
