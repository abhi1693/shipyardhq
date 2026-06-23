// Server-side image processing helpers
import { type BinaryInput, toNodeBuffer } from "@/lib/binary"

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
  input: BinaryInput,
  originalMime: string,
): Promise<ProcessResult> {
  // Prefer lossless conversions so we never ship visibly degraded assets.
  const effort = 6
  const buf = toNodeBuffer(input)

  try {
    const sharp = (await import("sharp")).default
    // Avoid breaking animated GIF/SVG — preserve original in those cases
    if (originalMime.includes("gif") || originalMime.includes("svg")) {
      return {
        buffer: buf,
        contentType: originalMime || "application/octet-stream",
        extension: guessExtFromMime(originalMime),
      }
    }
    // Convert to WebP (lossless) and only keep if it actually shrinks the asset.
    const webp = await sharp(buf).webp({ lossless: true, effort }).toBuffer()
    if (webp.length < buf.length) {
      return { buffer: webp, contentType: "image/webp", extension: "webp" }
    }
    // Fallback: keep the original buffer to avoid quality loss.
    return {
      buffer: buf,
      contentType: originalMime || "application/octet-stream",
      extension: guessExtFromMime(originalMime),
    }
  } catch {
    // Fallback if sharp is unavailable in the environment
    return {
      buffer: buf,
      contentType: originalMime || "application/octet-stream",
      extension: guessExtFromMime(originalMime),
    }
  }
}
