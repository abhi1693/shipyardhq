import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  applyCache: vi.fn(),
  connection: vi.fn(),
  findFirst: vi.fn(),
  productFindUnique: vi.fn(),
}))

vi.mock("@/lib/cache", () => ({
  applyCache: mocks.applyCache,
  DEFAULT_TTL: { medium: 120, slow: 300 },
  TAGS: {
    plans: "plans",
    products: "products",
    product: (slug: string) => `product:${slug}`,
  },
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    product: {
      findUnique: mocks.productFindUnique,
    },
    plan: {
      findFirst: mocks.findFirst,
    },
  },
}))

vi.mock("next/server", () => ({ connection: mocks.connection }))

import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"
import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"

describe("default plan cache", () => {
  beforeEach(() => {
    mocks.applyCache.mockReset()
    mocks.connection.mockReset()
    mocks.findFirst.mockReset()
    mocks.productFindUnique.mockReset()
  })

  it("keeps the default-plan query inside a plan-tagged Cache Components loader", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/server/planDefaults.ts"),
      "utf8",
    )

    expect(source).toMatch(
      /async function getCachedDefaultPlanWithFeatures\([\s\S]*?"use cache"[\s\S]*?applyCache\(\[TAGS\.plans\], DEFAULT_TTL\.slow\)/,
    )
  })

  it("loads the newest default plan and registers plan invalidation", async () => {
    const plan = {
      id: "plan-free",
      name: "Free",
      price: 0,
      type: "free",
      boostForDays: null,
      isDefault: true,
      assignments: [],
    }
    mocks.findFirst.mockResolvedValue(plan)

    await expect(getDefaultPlanWithFeatures()).resolves.toEqual(plan)

    expect(mocks.applyCache).toHaveBeenCalledWith(["plans"], 300)
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDefault: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    )
  })

  it("does not expose transient database failures to public product pages", async () => {
    const error = new Error("database unavailable")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.findFirst.mockRejectedValue(error)

    await expect(getDefaultPlanWithFeatures()).resolves.toBeNull()

    expect(consoleError).toHaveBeenCalledWith(
      "[plans] failed to load default plan with features",
      error,
    )
  })
})

describe("public product metadata plan fallback", () => {
  beforeEach(() => {
    mocks.applyCache.mockReset()
    mocks.connection.mockReset()
    mocks.findFirst.mockReset()
    mocks.productFindUnique.mockReset()
  })

  it("does not load grants or the default plan for SEO metadata", async () => {
    mocks.productFindUnique.mockResolvedValue({
      id: "product-free",
      slug: "free-product",
      status: "published",
    })

    await expect(getPublicProductMetaBySlug("free-product")).resolves.toEqual({
      id: "product-free",
      slug: "free-product",
      status: "published",
    })

    expect(mocks.productFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "free-product" },
        select: expect.not.objectContaining({ planGrants: expect.anything() }),
      }),
    )
    expect(mocks.findFirst).not.toHaveBeenCalled()
    expect(mocks.connection).not.toHaveBeenCalled()
  })
})
