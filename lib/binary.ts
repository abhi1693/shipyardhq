export type BinaryInput = ArrayBuffer | SharedArrayBuffer | ArrayBufferView

function objectTag(value: unknown) {
  return Object.prototype.toString.call(value)
}

export function isSharedArrayBuffer(
  value: unknown,
): value is SharedArrayBuffer {
  return objectTag(value) === "[object SharedArrayBuffer]"
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return objectTag(value) === "[object ArrayBuffer]"
}

function copyViewToBuffer(view: Uint8Array) {
  const copy = Buffer.allocUnsafe(view.byteLength)
  copy.set(view)
  return copy
}

export function toNodeBuffer(input: BinaryInput) {
  if (Buffer.isBuffer(input)) {
    return isSharedArrayBuffer(input.buffer) ? copyViewToBuffer(input) : input
  }

  if (ArrayBuffer.isView(input)) {
    const view = new Uint8Array(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    )

    return isSharedArrayBuffer(input.buffer)
      ? copyViewToBuffer(view)
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  }

  if (isSharedArrayBuffer(input)) {
    return copyViewToBuffer(new Uint8Array(input))
  }

  if (isArrayBuffer(input)) {
    return Buffer.from(input)
  }

  throw new TypeError("Expected binary data")
}
