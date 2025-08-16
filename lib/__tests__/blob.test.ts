import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Reset env between tests
const OLD_ENV = process.env
beforeEach(() => {
  vi.resetModules()
  process.env = { ...OLD_ENV }
  delete process.env.BLOB_READ_WRITE_TOKEN
})
afterEach(() => {
  process.env = OLD_ENV
})

describe("blob client wrappers", () => {
  it("putBlob errors when token missing", async () => {
    const { putBlob } = await import("@/lib/blob")
    await expect(putBlob("k", new ArrayBuffer(0))).rejects.toThrow(
      "Missing BLOB_READ_WRITE_TOKEN",
    )
  })

  it("putBlob uses @vercel/blob.put when available", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "t"
    vi.mock("@vercel/blob", () => {
      const put = vi.fn(async () => ({
        url: "http://x",
        pathname: "foo",
        size: 0,
      }))
      return { put }
    })
    const { putBlob } = await import("@/lib/blob")
    const mod: any = await import("@vercel/blob")
    const res = await putBlob("foo", new ArrayBuffer(0), {
      contentType: "image/png",
    })
    expect(mod.put).toHaveBeenCalled()
    expect(res.url).toBe("http://x")
  })

  it("putBlob throws when put missing", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "t"
    vi.doMock(
      "@vercel/blob",
      () => ({ put: undefined, default: { put: undefined } }) as any,
    )
    const { putBlob } = await import("@/lib/blob")
    await expect(putBlob("k", new ArrayBuffer(0))).rejects.toThrow(
      "Vercel Blob client not available",
    )
  })

  it("deleteBlob errors when token missing", async () => {
    const { deleteBlob } = await import("@/lib/blob")
    await expect(deleteBlob("/x")).rejects.toThrow(
      "Missing BLOB_READ_WRITE_TOKEN",
    )
  })

  it("deleteBlobPrefix errors when token missing", async () => {
    const { deleteBlobPrefix } = await import("@/lib/blob")
    await expect(deleteBlobPrefix("/x/")).rejects.toThrow(
      "Missing BLOB_READ_WRITE_TOKEN",
    )
  })

  it("deleteBlobPrefix lists pages and deletes", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "t"
    vi.doMock(
      "@vercel/blob",
      () =>
        ({
          list: vi
            .fn()
            .mockResolvedValueOnce({ blobs: [{ url: "u1" }], cursor: "c1" })
            .mockResolvedValueOnce({
              blobs: [{ url: "u2" }],
              cursor: undefined,
            }),
          del: vi.fn(async () => {}),
        }) as any,
    )
    const { deleteBlobPrefix } = await import("@/lib/blob")
    await deleteBlobPrefix("/prefix/")
    const mod: any = await import("@vercel/blob")
    expect(mod.list).toHaveBeenCalledTimes(2)
    expect(mod.del).toHaveBeenCalledWith(["u1", "u2"], { token: "t" })
  })

  it("deleteBlob calls del with token", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "t"
    const del = vi.fn(async () => {})
    vi.doMock("@vercel/blob", () => ({ del, default: { del } }) as any)
    const { deleteBlob } = await import("@/lib/blob")
    await deleteBlob("/x")
    const mod: any = await import("@vercel/blob")
    expect(mod.del).toHaveBeenCalledWith("/x", { token: "t" })
  })
})
it("deleteBlob throws when del missing", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "t"
  vi.doMock(
    "@vercel/blob",
    () => ({ del: undefined, default: { del: undefined } }) as any,
  )
  const { deleteBlob } = await import("@/lib/blob")
  await expect(deleteBlob("/x")).rejects.toThrow(
    "Vercel Blob delete not available",
  )
})

it("deleteBlobPrefix throws when list/delete missing", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "t"
  vi.doMock(
    "@vercel/blob",
    () =>
      ({
        del: undefined,
        list: undefined,
        default: { del: undefined, list: undefined },
      }) as any,
  )
  const { deleteBlobPrefix } = await import("@/lib/blob")
  await expect(deleteBlobPrefix("/x")).rejects.toThrow(
    "Vercel Blob list/delete not available",
  )
})
