import { beforeEach, describe, expect, it, vi } from "vitest"

const unstableCacheMock = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}))

import { DEFAULT_TTL, accelerateTags, cached } from "@/lib/cache"

describe("accelerateTags", () => {
  it("sanitizes, deduplicates, and limits tags", () => {
    const result = accelerateTags([
      "products",
      "products", // duplicate
      " admin:analytics ", // sanitize
      "",
      "#extra",
      "with spaces",
      "more-than-five",
    ])

    expect(result).toEqual([
      "products",
      "_admin_analytics_",
      "_extra",
      "with_spaces",
      "more_than_five",
    ])
  })
})

describe("cached", () => {
  beforeEach(() => {
    unstableCacheMock.mockReset()
    unstableCacheMock.mockImplementation((fn: any) => vi.fn(fn))
  })

  it("wraps functions with unstable_cache using provided ttl and tags", async () => {
    const baseFn = vi.fn(async (name: string) => `hello ${name}`)

    const cachedFn = cached(baseFn, "greeting", {
      ttl: 120,
      tags: ([name]) => [`user:${name}`],
    })

    const result = await cachedFn("Ada")

    expect(result).toBe("hello Ada")
    expect(baseFn).toHaveBeenCalledWith("Ada")
    expect(unstableCacheMock).toHaveBeenCalledTimes(1)

    const call = unstableCacheMock.mock.calls[0]
    expect(call[1]).toEqual(["greeting"])
    expect(call[2]).toEqual({
      revalidate: 120,
      tags: ["greeting", "user:Ada"],
    })
  })

  it("defaults ttl and tags when not provided", async () => {
    const baseFn = vi.fn(async () => "ok")

    const cachedFn = cached(baseFn, "default")
    await cachedFn()

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["default"],
      {
        revalidate: DEFAULT_TTL.fast,
        tags: ["default"],
      },
    )
  })
})
