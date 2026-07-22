import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  cacheGetOrSet: vi.fn(),
}))

vi.mock("@/lib/server/cache", () => ({
  buildCacheKey: (...parts: string[]) => parts.join(":"),
  cacheGetOrSet: mocks.cacheGetOrSet,
}))

import {
  buildCatalogQueryCacheKey,
  cacheCatalogQuery,
  clearCatalogQueryMemoryCache,
  deserializeCatalogJson,
} from "@/lib/server/catalog-query-cache"

describe("catalog query cache", () => {
  beforeEach(() => {
    clearCatalogQueryMemoryCache()
    mocks.cacheGetOrSet.mockReset()
    mocks.cacheGetOrSet.mockImplementation(
      async ({ loader }: { loader: () => Promise<unknown> }) => loader(),
    )
  })

  it("builds the same key for equivalent query objects", () => {
    const left = buildCatalogQueryCacheKey("categories", {
      orderBy: { name: "asc" },
      where: { slug: "developer-tools", active: true },
    })
    const right = buildCatalogQueryCacheKey("categories", {
      where: { active: true, slug: "developer-tools" },
      orderBy: { name: "asc" },
    })

    expect(left).toBe(right)
  })

  it("retains resolved values in-process for the configured TTL", async () => {
    const loader = vi.fn().mockResolvedValue([{ id: "category-1" }])
    const key = buildCatalogQueryCacheKey("categories", {
      orderBy: { name: "asc" },
    })

    const first = await cacheCatalogQuery({
      key,
      ttlSeconds: 300,
      loader,
    })
    const second = await cacheCatalogQuery({
      key,
      ttlSeconds: 300,
      loader,
    })

    expect(first).toEqual([{ id: "category-1" }])
    expect(second).toBe(first)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(mocks.cacheGetOrSet).toHaveBeenCalledTimes(1)
  })

  it("restores Prisma timestamps read from Valkey", () => {
    const value = deserializeCatalogJson<{ updatedAt: Date }>(
      JSON.stringify({ updatedAt: "2026-07-22T00:00:00.000Z" }),
    )

    expect(value.updatedAt).toBeInstanceOf(Date)
    expect(value.updatedAt.toISOString()).toBe("2026-07-22T00:00:00.000Z")
  })
})
