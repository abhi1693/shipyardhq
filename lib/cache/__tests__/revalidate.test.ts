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
  revalidateMonthlyLeaderboard,
  revalidatePlanFeature,
  revalidateProduct,
  revalidateProducts,
  revalidateRewardsLeaderboard,
} from "@/lib/cache/revalidate"

beforeEach(() => {
  revalidateTagMock.mockClear()
})

describe("revalidate helpers", () => {
  it("revalidates products collection", () => {
    revalidateProducts()
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "products")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "browse")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "categories:directory")
  })

  it("revalidates individual product and collection", () => {
    revalidateProduct("product-1")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "product:product-1")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "products")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "browse")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(5, "categories:directory")
  })

  it("revalidates category and categories", () => {
    revalidateCategory("category-2")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "category:category-2")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "categories")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "browse")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(5, "categories:directory")
  })

  it("revalidates categories collection", () => {
    revalidateCategories()
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "categories")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "browse")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "categories:directory")
  })

  it("revalidates leaderboard family", () => {
    revalidateLeaderboard()
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "leaderboard")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "trending")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "analytics")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(5, "browse")
  })

  it("revalidates monthly leaderboard tags with month key", () => {
    revalidateMonthlyLeaderboard("30-04-2024")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "leaderboard:monthly")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(
      2,
      "leaderboard:monthly:30-04-2024",
    )
  })

  it("revalidates monthly leaderboard base tag when no key provided", () => {
    revalidateMonthlyLeaderboard()
    expect(revalidateTagMock).toHaveBeenCalledWith("leaderboard:monthly")
    expect(revalidateTagMock).toHaveBeenCalledTimes(1)
  })

  it("revalidates badges and products", () => {
    revalidateBadges()
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "badges")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "products")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "browse")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(5, "categories:directory")
  })

  it("revalidates plan feature and associated entities", () => {
    revalidatePlanFeature("analytics.advanced")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(
      1,
      "plan-feature:analytics.advanced",
    )
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "plans")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "products")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(4, "homepage")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(5, "browse")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(6, "categories:directory")
  })

  it("revalidates homepage directly", () => {
    revalidateHomepage()
    expect(revalidateTagMock).toHaveBeenCalledWith("homepage")
  })

  it("revalidates browse directly", () => {
    revalidateBrowse()
    expect(revalidateTagMock).toHaveBeenCalledWith("browse")
  })

  it("revalidates category directory directly", () => {
    revalidateCategoryDirectory()
    expect(revalidateTagMock).toHaveBeenCalledWith("categories:directory")
  })

  it("revalidates rewards leaderboard with homepage", () => {
    revalidateRewardsLeaderboard()
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "rewards:leaderboard")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "rewards")
    expect(revalidateTagMock).toHaveBeenNthCalledWith(3, "homepage")
  })
})
