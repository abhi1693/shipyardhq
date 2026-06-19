import { describe, expect, it, vi } from "vitest"
import { invalidateCacheByPrefix } from "@/lib/server/cache"

describe("invalidateCacheByPrefix", () => {
  it("falls back to SCAN when the Redis client has no scanIterator", async () => {
    const scan = vi
      .fn()
      .mockResolvedValueOnce({
        cursor: "7",
        keys: ["production:homepage:feed:v1", "production:homepage:feed:v2"],
      })
      .mockResolvedValueOnce({
        cursor: "0",
        keys: ["production:homepage:feed:v3"],
      })
    const del = vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1)
    const onError = vi.fn()

    const result = await invalidateCacheByPrefix({
      keyPrefix: "production:homepage:feed",
      client: {
        get: vi.fn(),
        set: vi.fn(),
        del,
        scan,
        isOpen: true,
      } as never,
      onError,
    })

    expect(scan).toHaveBeenNthCalledWith(1, "0", {
      MATCH: "production:homepage:feed*",
      COUNT: 100,
    })
    expect(scan).toHaveBeenNthCalledWith(2, "7", {
      MATCH: "production:homepage:feed*",
      COUNT: 100,
    })
    expect(del).toHaveBeenNthCalledWith(1, [
      "production:homepage:feed:v1",
      "production:homepage:feed:v2",
    ])
    expect(del).toHaveBeenNthCalledWith(2, ["production:homepage:feed:v3"])
    expect(onError).not.toHaveBeenCalled()
    expect(result).toEqual({
      prefix: "production:homepage:feed",
      redisKeysDeleted: 3,
      inProcessKeysDeleted: 0,
    })
  })
})
