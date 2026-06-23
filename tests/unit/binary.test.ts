import { describe, expect, it } from "vitest"

import { isSharedArrayBuffer, toNodeBuffer } from "@/lib/binary"

describe("binary helpers", () => {
  it("copies SharedArrayBuffer input into a normal Buffer", () => {
    const shared = new SharedArrayBuffer(3)
    new Uint8Array(shared).set([1, 2, 3])

    const buffer = toNodeBuffer(shared)

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect([...buffer]).toEqual([1, 2, 3])
    expect(isSharedArrayBuffer(buffer.buffer)).toBe(false)
  })

  it("preserves byte offsets for typed array views", () => {
    const source = new Uint8Array([1, 2, 3, 4])
    const view = new DataView(source.buffer, 1, 2)

    expect([...toNodeBuffer(view)]).toEqual([2, 3])
  })
})
