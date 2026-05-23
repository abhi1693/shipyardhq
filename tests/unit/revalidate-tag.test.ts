import { afterEach, describe, expect, it, vi } from "vitest"

const nextCache = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidateTag: nextCache.revalidateTag,
  updateTag: nextCache.updateTag,
}))

import { revalidateTag } from "@/lib/cache/revalidateTag"

describe("revalidateTag", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("falls back from updateTag to revalidateTag outside server actions", () => {
    nextCache.updateTag.mockImplementationOnce(() => {
      throw new Error("updateTag can only be used inside a Server Action")
    })

    revalidateTag("leaderboard")

    expect(nextCache.updateTag).toHaveBeenCalledWith("leaderboard")
    expect(nextCache.revalidateTag).toHaveBeenCalledWith("leaderboard", "max")
  })

  it("does not fail background workers when Next lacks a static generation store", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    nextCache.revalidateTag.mockImplementationOnce(() => {
      throw new Error(
        "Invariant: static generation store missing in revalidateTag leaderboard",
      )
    })

    expect(() => revalidateTag("leaderboard", "revalidate")).not.toThrow()

    expect(nextCache.revalidateTag).toHaveBeenCalledWith("leaderboard", "max")
    expect(warnSpy).toHaveBeenCalledWith(
      "[cache] skipped Next cache invalidation outside request context",
      {
        tag: "leaderboard",
        error:
          "Invariant: static generation store missing in revalidateTag leaderboard",
      },
    )
    warnSpy.mockRestore()
  })

  it("does not fail update-mode invalidations outside a Next request context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    nextCache.updateTag.mockImplementationOnce(() => {
      throw new Error(
        "Invariant: static generation store missing in updateTag products",
      )
    })

    expect(() => revalidateTag("products")).not.toThrow()

    expect(nextCache.updateTag).toHaveBeenCalledWith("products")
    expect(nextCache.revalidateTag).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      "[cache] skipped Next cache invalidation outside request context",
      {
        tag: "products",
        error: "Invariant: static generation store missing in updateTag products",
      },
    )
    warnSpy.mockRestore()
  })
})
