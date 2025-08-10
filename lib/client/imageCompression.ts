// Best-effort client-side, lossless image recompression to save bandwidth.
// - PNG: re-encode via Canvas to strip metadata (lossless)
// - SVG/GIF: return original (avoid rasterizing or changing animation)
// - JPEG: return original (true lossless recompression requires extra codecs)
// - WEBP: return original (Canvas API cannot guarantee lossless re-encode)

export async function compressImageLossless(file: File): Promise<File | Blob> {
  const type = (file.type || "").toLowerCase()
  if (!type.startsWith("image/")) return file

  if (
    type.includes("svg") ||
    type.includes("gif") ||
    type.includes("jpeg") ||
    type.includes("jpg") ||
    type.includes("webp")
  ) {
    // Keep original for formats where Canvas cannot guarantee lossless or might break animation.
    return file
  }

  if (type.includes("png")) {
    try {
      const img = await fileToImage(file)
      const { canvas, ctx } = createCanvas(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
      )
      ctx.drawImage(img, 0, 0)
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/png",
        ),
      )
      // Only use compressed if smaller
      if (blob.size < file.size) return blob
      return file
    } catch {
      return file
    }
  }

  return file
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

function createCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  return { canvas, ctx }
}
