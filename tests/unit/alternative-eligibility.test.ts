import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), applyCache: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  default: { alternativeProduct: { findMany: mocks.findMany } },
}))
vi.mock("@/actions/public/use-cases/actions", () => ({
  getPublicUseCasesWithCounts: vi.fn(),
}))
vi.mock("@/lib/cache", () => ({
  applyCache: mocks.applyCache,
  DEFAULT_TTL: { slowest: 3600 },
  TAGS: { products: "products", alternativeProducts: "alternatives" },
}))

import {
  alternativeCollectionTitle,
  isAlternativeIndexable,
  robotsForAlternative,
} from "@/lib/seo/alternative-eligibility"
import { getIndexableAlternativeRecords } from "@/lib/server/alternative-indexing"
import {
  getAlternativeSitemapChunk,
  getAlternativeSitemapStats,
} from "@/lib/server/sitemap-data"

function record(slug: string, products: number) {
  return {
    slug,
    updatedAt: new Date("2026-10-29T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    _count: { products },
  }
}

describe("alternative index eligibility", () => {
  beforeEach(() =>
    mocks.findMany.mockResolvedValue([
      record("empty", 0),
      record("thin", 9),
      record("threshold", 10),
      record("large", 50),
    ]),
  )

  it.each([0, 9, NaN])(
    "keeps an ordinary insufficient collection noindex with %s products",
    (count) => {
      expect(isAlternativeIndexable("ordinary", count)).toBe(false)
      expect(robotsForAlternative("ordinary", count)).toMatchObject({
        index: false,
        follow: true,
      })
    },
  )
  it("keeps qualifying inventory and the explicit reviewed comparison indexable", () => {
    expect(robotsForAlternative("ordinary", 10)).toBeUndefined()
    expect(robotsForAlternative("product-hunt", 0)).toBeUndefined()
    expect(isAlternativeIndexable("unreviewed", 0)).toBe(false)
  })
  it("avoids Best claims for empty or mapped-product collections", () => {
    expect(alternativeCollectionTitle("Example", 0)).toBe(
      "Example alternatives",
    )
    expect(alternativeCollectionTitle("Example", 10)).toBe(
      "10 listed Example alternatives",
    )
  })
  it("counts published products only and invalidates on product publication changes", async () => {
    const eligible = await getIndexableAlternativeRecords()
    expect(eligible.map((item) => item.slug)).toEqual([
      "product-hunt",
      "large",
      "threshold",
    ])
    const args = mocks.findMany.mock.calls[0][0]
    expect(args.select._count.select.products.where).toMatchObject({
      AND: [{ status: "published" }],
    })
    expect(mocks.applyCache).toHaveBeenCalledWith(
      ["alternatives", "products"],
      3600,
    )
  })
  it("filters before pagination so totals and shard boundaries have no holes", async () => {
    const stats = await getAlternativeSitemapStats()
    const first = await getAlternativeSitemapChunk(0, 2)
    const second = await getAlternativeSitemapChunk(2, 2)
    const outOfRange = await getAlternativeSitemapChunk(4, 2)
    expect(stats.total).toBe(3)
    expect(stats.lastUpdated?.toISOString()).toBe("2026-10-30T00:00:00.000Z")
    expect([...first, ...second].map((item) => item.slug)).toEqual([
      "product-hunt",
      "large",
      "threshold",
    ])
    expect(new Set([...first, ...second].map((item) => item.slug)).size).toBe(
      stats.total,
    )
    expect(outOfRange).toEqual([])
  })
  it("does not duplicate the editorial route when a mapped record already exists", async () => {
    mocks.findMany.mockResolvedValue([
      record("product-hunt", 0),
      record("ordinary", 10),
    ])
    const records = await getIndexableAlternativeRecords()
    expect(records.filter((item) => item.slug === "product-hunt")).toHaveLength(
      1,
    )
  })
  it("retains the reviewed comparison when ordinary collections are empty", async () => {
    mocks.findMany.mockResolvedValue([record("ordinary", 0)])
    expect((await getAlternativeSitemapStats()).total).toBe(1)
    expect((await getAlternativeSitemapChunk(0, 10))[0].slug).toBe(
      "product-hunt",
    )
  })
})
