import { beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
  useCase: { findUnique: vi.fn() },
  category: { findUnique: vi.fn() },
  product: { count: vi.fn(), findMany: vi.fn() },
}))
vi.mock("@/lib/prisma", () => ({ default: db }))
vi.mock("@/lib/cache", () => ({
  applyCache: vi.fn(),
  DEFAULT_TTL: { medium: 60 },
  TAGS: {
    products: "products",
    categories: "categories",
    planFeature: () => "plans",
  },
}))
vi.mock("@/lib/products/priority-plans", () => ({
  getPriorityPlacementPlanIds: async () => [],
  buildPriorityPlanFilter: () => ({}),
  buildRegularPlanFilter: () => ({}),
}))
vi.mock("@/lib/products/leaderboard-scores", () => ({
  getCurrentScoreMap: async () => new Map(),
}))
vi.mock("@/lib/products/selects", () => ({
  productCardSelect: {},
  mapProductCardRecordToBase: (record: unknown) => record,
}))

import { getBrowseProducts } from "@/actions/public/browse/actions"

const fixtures = [
  { id: "primary-a", status: "published", categoryId: "a", categories: [] },
  {
    id: "secondary-a",
    status: "published",
    categoryId: "c",
    categories: [{ categoryId: "a" }],
  },
  { id: "primary-b", status: "published", categoryId: "b", categories: [] },
  { id: "draft-a", status: "draft", categoryId: "a", categories: [] },
]

type Where = {
  AND?: Where[]
  OR?: Where[]
  status?: string
  categoryId?: { in: string[] }
  categories?: { some: { categoryId: { in: string[] } } }
}
function matches(product: (typeof fixtures)[number], where: Where): boolean {
  return (
    (!where.AND || where.AND.every((clause) => matches(product, clause))) &&
    (!where.OR || where.OR.some((clause) => matches(product, clause))) &&
    (!where.status || product.status === where.status) &&
    (!where.categoryId || where.categoryId.in.includes(product.categoryId)) &&
    (!where.categories ||
      product.categories.some((category) =>
        where.categories!.some.categoryId.in.includes(category.categoryId),
      ))
  )
}

describe("browse use-case and category intersection", () => {
  beforeEach(() => {
    db.useCase.findUnique.mockResolvedValue({
      categories: [{ categoryId: "a" }],
    })
    db.category.findUnique.mockImplementation(async ({ where }) =>
      ["a", "b"].includes(where.slug) ? { id: where.slug } : null,
    )
    db.product.count.mockImplementation(
      async ({ where }) =>
        fixtures.filter((product) => matches(product, where)).length,
    )
    db.product.findMany.mockImplementation(async ({ where, skip, take }) =>
      fixtures
        .filter((product) => matches(product, where))
        .slice(skip, skip + take),
    )
  })

  it("narrows to a member category and includes primary and secondary assignments", async () => {
    db.useCase.findUnique.mockResolvedValue({
      categories: [{ categoryId: "a" }, { categoryId: "b" }],
    })
    const result = await getBrowseProducts({
      useCaseSlug: "use-case",
      categorySlug: "a",
    })
    expect(result.products.map((product) => product.id)).toEqual([
      "primary-a",
      "secondary-a",
    ])
    expect(result.total).toBe(2)
  })

  it("returns no matches for an unrelated category instead of dropping the use case", async () => {
    const result = await getBrowseProducts({
      useCaseSlug: "use-case",
      categorySlug: "b",
    })
    expect(result.products).toEqual([])
    expect(result.hasMore).toBe(false)
    expect(db.product.findMany).not.toHaveBeenCalled()
  })

  it.each([null, { categories: [] }])(
    "returns no matches for missing or unassigned use cases",
    async (useCase) => {
      db.useCase.findUnique.mockResolvedValue(useCase)
      expect(
        (await getBrowseProducts({ useCaseSlug: "unknown", categorySlug: "b" }))
          .products,
      ).toEqual([])
      expect(db.product.findMany).not.toHaveBeenCalled()
    },
  )

  it("keeps category-only filtering", async () => {
    expect(
      (await getBrowseProducts({ categorySlug: "b" })).products.map(
        (product) => product.id,
      ),
    ).toEqual(["primary-b"])
    expect(db.useCase.findUnique).not.toHaveBeenCalled()
  })

  it("keeps use-case-only filtering", async () => {
    expect(
      (await getBrowseProducts({ useCaseSlug: "use-case" })).products.map(
        (product) => product.id,
      ),
    ).toEqual(["primary-a", "secondary-a"])
  })

  it("returns no matches for an unknown category", async () => {
    expect(
      (
        await getBrowseProducts({
          useCaseSlug: "use-case",
          categorySlug: "missing",
        })
      ).products,
    ).toEqual([])
  })
})
