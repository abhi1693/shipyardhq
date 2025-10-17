import { describe, expect, it, beforeEach, vi } from "vitest"

import { getVersusMatchup } from "../versus"
import { getLiveUpvoteCount } from "@/lib/server/productVotesStore"
import { hasUserUpvoted } from "../actions"

const cacheMock = vi.hoisted(() => ({
  accelerateTags: vi.fn((tags: string[]) => tags),
  cached: (fn: any) => fn,
  DEFAULT_TTL: { fast: 60, medium: 120, slow: 300 },
  DEFAULT_SWR: { fast: 60, medium: 120, slow: 300 },
  TAGS: {
    products: "products",
    leaderboard: "leaderboard",
    analytics: "analytics",
  },
}))

vi.mock("@/lib/cache", () => cacheMock)

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}))

vi.mock("@/lib/server/productVotesStore", () => ({
  getLiveUpvoteCount: vi.fn(),
}))

vi.mock("../actions", () => ({
  hasUserUpvoted: vi.fn(),
}))

const mockGetLiveUpvoteCount = vi.mocked(getLiveUpvoteCount)
const mockHasUserUpvoted = vi.mocked(hasUserUpvoted)

describe("getVersusMatchup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.product.findMany.mockReset()
  })

  it("returns a pair decorated with live upvotes and user state", async () => {
    const pool = [
      {
        id: "prod-1",
        slug: "alpha",
        name: "Alpha",
        tagline: "First product",
        logo: "/alpha.png",
        websiteUrl: "https://alpha.example.com",
        category: { name: "AI", slug: "ai" },
        analytics: { upvotes: 10 },
        user: { firstName: "Alex", lastName: "Maker" },
      },
      {
        id: "prod-2",
        slug: "beta",
        name: "Beta",
        tagline: "Second product",
        logo: "/beta.png",
        websiteUrl: "https://beta.example.com",
        category: { name: "DevTools", slug: "devtools" },
        analytics: { upvotes: 6 },
        user: { firstName: "Bailey", lastName: null },
      },
      {
        id: "prod-3",
        slug: "gamma",
        name: "Gamma",
        tagline: "Third product",
        logo: "/gamma.png",
        websiteUrl: null,
        category: { name: "Ops", slug: "ops" },
        analytics: { upvotes: 3 },
        user: null,
      },
    ]

    prismaMock.product.findMany.mockResolvedValue(pool)

    const randomSpy = vi.spyOn(Math, "random")
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.9)

    mockGetLiveUpvoteCount.mockResolvedValueOnce(42).mockResolvedValueOnce(7)

    mockHasUserUpvoted.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const result = await getVersusMatchup({ clerkUserId: "clerk_123" })

    expect(result).toEqual([
      {
        id: "prod-1",
        slug: "alpha",
        name: "Alpha",
        tagline: "First product",
        logo: "/alpha.png",
        websiteUrl: "https://alpha.example.com",
        category: { name: "AI", slug: "ai" },
        upvotes: 42,
        makerName: "Alex Maker",
        upvoted: true,
      },
      {
        id: "prod-3",
        slug: "gamma",
        name: "Gamma",
        tagline: "Third product",
        logo: "/gamma.png",
        websiteUrl: null,
        category: { name: "Ops", slug: "ops" },
        upvotes: 7,
        makerName: null,
        upvoted: false,
      },
    ])

    expect(mockHasUserUpvoted).toHaveBeenCalledTimes(2)
    randomSpy.mockRestore()
  })

  it("falls back to the full pool when exclusions remove options", async () => {
    const pool = [
      {
        id: "prod-1",
        slug: "alpha",
        name: "Alpha",
        tagline: "First product",
        logo: "/alpha.png",
        websiteUrl: null,
        category: { name: "AI", slug: "ai" },
        analytics: { upvotes: 5 },
        user: null,
      },
      {
        id: "prod-2",
        slug: "beta",
        name: "Beta",
        tagline: "Second product",
        logo: "/beta.png",
        websiteUrl: null,
        category: { name: "DevTools", slug: "devtools" },
        analytics: { upvotes: 2 },
        user: null,
      },
    ]

    prismaMock.product.findMany.mockResolvedValue(pool)

    const randomSpy = vi.spyOn(Math, "random")
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.6)

    mockGetLiveUpvoteCount.mockResolvedValue(0)

    const result = await getVersusMatchup({
      excludeIds: ["prod-1", "prod-2"],
    })

    expect(result).toHaveLength(2)
    expect(new Set(result.map((product) => product.id))).toEqual(
      new Set(["prod-1", "prod-2"]),
    )

    expect(mockHasUserUpvoted).not.toHaveBeenCalled()
    randomSpy.mockRestore()
  })

  it("returns empty when the pool cannot yield two distinct products", async () => {
    const pool = [
      {
        id: "prod-1",
        slug: "alpha",
        name: "Alpha",
        tagline: "First product",
        logo: "/alpha.png",
        websiteUrl: null,
        category: { name: "AI", slug: "ai" },
        analytics: { upvotes: 5 },
        user: null,
      },
    ]

    prismaMock.product.findMany.mockResolvedValue(pool)

    const result = await getVersusMatchup()
    expect(result).toEqual([])
  })

  it("returns an empty array when the pool is empty", async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    const result = await getVersusMatchup()
    expect(result).toEqual([])
    expect(mockGetLiveUpvoteCount).not.toHaveBeenCalled()
    expect(mockHasUserUpvoted).not.toHaveBeenCalled()
  })
})
