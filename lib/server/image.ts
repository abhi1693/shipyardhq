// Server-side image processing helpers

type ProcessResult = {
  buffer: Buffer
  contentType: string
  extension: string
}

function guessExtFromMime(mime: string): string {
  if (mime.includes("png")) return "png"
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg"
  if (mime.includes("gif")) return "gif"
  if (mime.includes("webp")) return "webp"
  if (mime.includes("svg")) return "svg"
  return "bin"
}

export async function toWebpIfPossible(
  input: ArrayBuffer,
  originalMime: string,
): Promise<ProcessResult> {
  // Always attempt conversion; use result only if smaller
  const lossless = false
  const effort = 6
  const quality = 82 // only used if we ever switch to lossy
  try {
    const sharp = (await import("sharp")).default
    // Avoid breaking animated GIF/SVG — preserve original in those cases
    if (originalMime.includes("gif") || originalMime.includes("svg")) {
      return {
        buffer: Buffer.from(input),
        contentType: originalMime || "application/octet-stream",
        extension: guessExtFromMime(originalMime),
      }
    }
    const buf = Buffer.from(input)
    // Convert to WebP (lossless or quality-based)
    const webp = await sharp(buf)
      .webp(lossless ? { lossless: true, effort } : { quality, effort })
      .toBuffer()
    // Only use WebP if smaller; otherwise keep original
    if (webp.length < buf.length) {
      return { buffer: webp, contentType: "image/webp", extension: "webp" }
    }
    return {
      buffer: buf,
      contentType: originalMime || "application/octet-stream",
      extension: guessExtFromMime(originalMime),
    }
  } catch {
    // Fallback if sharp is unavailable in the environment
    return {
      buffer: Buffer.from(input),
      contentType: originalMime || "application/octet-stream",
      extension: guessExtFromMime(originalMime),
    }
  }
}
