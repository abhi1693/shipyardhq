import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { compressImageLossless } from "@/lib/client/imageCompression"

const origCreate = document.createElement
const OLD_URL = (global as any).URL

class FakeImage {
  onload: any
  onerror: any
  naturalWidth = 10
  naturalHeight = 10
  set src(_v: string) {
    setTimeout(() => this.onload && this.onload(), 0)
  }
}

beforeEach(() => {
  // @ts-expect-error test: override Image constructor
  global.Image = FakeImage
  // stub URL
  global.URL = {
    createObjectURL: vi.fn(() => "blob:x"),
    revokeObjectURL: vi.fn(),
  } as any
})
afterEach(() => {
  document.createElement = origCreate
  // @ts-expect-error test: remove Image override
  delete global.Image
  global.URL = OLD_URL
})

function makeFile(type: string, size = 10) {
  const data = new Uint8Array(size)
  return new File([data], "x." + (type.split("/")[1] || "bin"), { type } as any)
}

describe("compressImageLossless", () => {
  it("returns original for non-image", async () => {
    const f = makeFile("text/plain")
    expect(await compressImageLossless(f as any)).toBe(f)
  })

  it("returns original for jpg/gif/webp", async () => {
    for (const t of [
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ]) {
      const f = makeFile(t)
      const out = await compressImageLossless(f as any)
      expect(out).toBe(f)
    }
  })

  it("returns original for unknown image types (e.g. bmp)", async () => {
    const f = makeFile("image/bmp")
    const out = await compressImageLossless(f as any)
    expect(out).toBe(f)
  })
  it("returns smaller blob for png when toBlob smaller", async () => {
    document.createElement = vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: any) =>
        setTimeout(
          () => cb(new Blob([new Uint8Array([1])], { type: "image/png" })),
          0,
        ),
    })) as any
    const f = makeFile("image/png", 10)
    const out = await compressImageLossless(f as any)
    expect(out).not.toBe(f)
  })

  it("returns original for png when toBlob larger", async () => {
    document.createElement = vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: any) =>
        setTimeout(
          () => cb(new Blob([new Uint8Array(100)], { type: "image/png" })),
          0,
        ),
    })) as any
    const f = makeFile("image/png", 10)
    const out = await compressImageLossless(f as any)
    expect(out).toBe(f)
  })

  it("returns original when toBlob fails", async () => {
    document.createElement = vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: any) => setTimeout(() => cb(null), 0),
    })) as any
    const f = makeFile("image/png", 10)
    const out = await compressImageLossless(f as any)
    expect(out).toBe(f)
  })

  it("returns original when image fails to load", async () => {
    class ErrImage {
      onload: any
      onerror: any
      set src(_v: string) {
        setTimeout(() => this.onerror && this.onerror(new Error("x")), 0)
      }
    }
    global.Image = ErrImage as any
    document.createElement = vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: any) =>
        setTimeout(
          () => cb(new Blob([new Uint8Array(1)], { type: "image/png" })),
          0,
        ),
    })) as any
    const f = makeFile("image/png", 10)
    const out = await compressImageLossless(f as any)
    expect(out).toBe(f)
  })
})
