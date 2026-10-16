import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  cacheGetOrSet: vi.fn(),
  io: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("next/cache", () => ({ io: mocks.io }))

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

  it("defers TTL reads on both cold and warm hits until I/O is allowed", async () => {
    const key = buildCatalogQueryCacheKey("prerender-boundary")
    const loader = vi.fn().mockResolvedValue("cached")
    await cacheCatalogQuery({ key, ttlSeconds: 300, loader })

    let release!: () => void
    mocks.io.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    let completed = false
    const hit = cacheCatalogQuery({ key, ttlSeconds: 300, loader }).then(
      (value) => {
        completed = true
        return value
      },
    )
    await Promise.resolve()
    expect(completed).toBe(false)
    release()
    await expect(hit).resolves.toBe("cached")
    expect(loader).toHaveBeenCalledTimes(1)
    expect(mocks.io).toHaveBeenCalledTimes(2)
  })
})
