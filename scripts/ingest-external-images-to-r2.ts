#!/usr/bin/env tsx

import { createHash } from "node:crypto"

import { loadEnvConfig } from "@next/env"
import sharp from "sharp"

type ImageKind =
  | "alternative-logo"
  | "product-banner"
  | "product-logo"
  | "product-media"

type OutputFormat = "avif" | "webp"

type Args = {
  apply: boolean
  concurrency: number
  format: OutputFormat
  help: boolean
  limit?: number
  logosOnly: boolean
  strict: boolean
}

type Candidate = {
  id: string
  kind: ImageKind
  keyPrefix: string
  label: string
  maxHeight: number
  maxWidth: number
  quality: number
  sourceUrl: string
  update: (url: string) => Promise<unknown>
}

type DownloadedImage = {
  buffer: Buffer
  contentType: string
}

type ProcessedImage = {
  buffer: Buffer
  contentType: string
  extension: OutputFormat
}

type UploadResult = {
  bytes: number
  reused: boolean
  sourceUrl: string
  url: string
}

const DEFAULT_PUBLIC_MEDIA_BASE_URL = "https://media.shipyardhq.dev"
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000
const HTML_FETCH_TIMEOUT_MS = 8_000

function printUsage() {
  console.log(`Usage:
  npm run images:ingest-external -- [options]

Options:
  --apply              Upload to R2 and update database records. Defaults to dry-run.
  --dry-run            Print candidates without changing R2 or the database.
  --logos-only         Only migrate Product.logo and AlternativeProduct.logoUrl.
  --format webp|avif   Output format for stored R2 assets. Default: webp.
  --limit <n>          Process at most n candidates after filtering.
  --concurrency <n>    Concurrent downloads/uploads. Default: 3.
  --strict             Exit non-zero when any candidate fails.
  --help               Show this help.

Examples:
  npm run images:ingest-external -- --dry-run --logos-only
  npm run images:ingest-external -- --apply --logos-only
  npm run images:ingest-external -- --apply --format avif --limit 25
`)
}

function readPositiveInteger(raw: string | undefined, label: string) {
  if (!raw) throw new Error(`Missing value for ${label}`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`)
  }
  return value
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    apply: false,
    concurrency: 3,
    format: "webp",
    help: false,
    logosOnly: false,
    strict: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    switch (arg) {
      case "--apply":
        args.apply = true
        break
      case "--dry-run":
        args.apply = false
        break
      case "--logos-only":
        args.logosOnly = true
        break
      case "--strict":
        args.strict = true
        break
      case "--help":
      case "-h":
        args.help = true
        break
      case "--limit":
        args.limit = readPositiveInteger(argv[++index], "--limit")
        break
      case "--concurrency":
        args.concurrency = readPositiveInteger(argv[++index], "--concurrency")
        break
      case "--format": {
        const format = argv[++index]
        if (format !== "avif" && format !== "webp") {
          throw new Error("--format must be either webp or avif")
        }
        args.format = format
        break
      }
      default:
        throw new Error(`Unknown option: ${arg}`)
    }
  }

  return args
}

function getManagedMediaHosts() {
  const hosts = new Set<string>()
  for (const value of [
    DEFAULT_PUBLIC_MEDIA_BASE_URL,
    process.env.R2_PUBLIC_BASE_URL,
  ]) {
    if (!value) continue
    try {
      hosts.add(new URL(value).hostname)
    } catch {
      // Ignore invalid env values here; putBlob will validate before upload.
    }
  }
  return hosts
}

function normalizeExternalImageUrl(value: string, managedHosts: Set<string>) {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith("/") || trimmed.startsWith("data:")) {
    return null
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (managedHosts.has(url.hostname)) return null
    return url.href
  } catch {
    return null
  }
}

function sanitizeFilename(value: string) {
  return value
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function basenameFromUrl(sourceUrl: string, fallback: string) {
  try {
    const pathname = decodeURIComponent(new URL(sourceUrl).pathname)
    const rawBase = pathname.split("/").filter(Boolean).at(-1) || fallback
    return sanitizeFilename(rawBase) || sanitizeFilename(fallback) || "image"
  } catch {
    return sanitizeFilename(fallback) || "image"
  }
}

function hash(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex")
}

function compactLabel(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function isAcceptableImageResponse(contentType: string) {
  if (!contentType) return true
  if (contentType.startsWith("image/")) return true
  return (
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream"
  )
}

function isLikelyFaviconUrl(sourceUrl: string) {
  try {
    const pathname = new URL(sourceUrl).pathname.toLowerCase()
    return pathname.endsWith(".ico") || pathname.includes("favicon")
  } catch {
    return false
  }
}

function isUnsupportedImageError(error: unknown) {
  return (
    error instanceof Error &&
    /unsupported image format|unsupported content type/i.test(error.message)
  )
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function getTagAttribute(tag: string, attributeName: string) {
  const attributePattern =
    /([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(tag))) {
    if (match[1]?.toLowerCase() !== attributeName) continue
    return decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? "")
  }

  return null
}

function scoreFallbackImageUrl(sourceUrl: string) {
  const lower = sourceUrl.toLowerCase()
  if (lower.includes("apple-touch-icon")) return 0
  if (lower.endsWith(".png") || lower.includes(".png?")) return 1
  if (lower.endsWith(".webp") || lower.includes(".webp?")) return 2
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return 3
  if (lower.includes(".jpg?") || lower.includes(".jpeg?")) return 3
  if (lower.endsWith(".svg") || lower.includes(".svg?")) return 4
  if (lower.endsWith(".ico") || lower.includes(".ico?")) return 9
  return 5
}

function uniqueUrls(urls: string[], excludedUrl: string) {
  const excluded = excludedUrl.trim()
  const seen = new Set([excluded])
  const unique: string[] = []

  for (const url of urls) {
    if (seen.has(url)) continue
    seen.add(url)
    unique.push(url)
  }

  return unique.sort(
    (left, right) => scoreFallbackImageUrl(left) - scoreFallbackImageUrl(right),
  )
}

function commonIconFallbackUrls(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl)
    const paths = [
      "/apple-touch-icon.png",
      "/apple-touch-icon-precomposed.png",
      "/favicon-512x512.png",
      "/favicon-256x256.png",
      "/favicon-192x192.png",
      "/favicon-180x180.png",
      "/favicon-128x128.png",
      "/favicon-96x96.png",
      "/favicon-64x64.png",
      "/favicon-48x48.png",
      "/favicon-32x32.png",
      "/favicon-16x16.png",
      "/favicon.png",
      "/icon.png",
      "/logo.png",
      "/favicon.svg",
      "/favicon.ico",
    ]

    return paths.map((path) => new URL(path, url.origin).href)
  } catch {
    return []
  }
}

async function discoverIconLinkUrls(sourceUrl: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HTML_FETCH_TIMEOUT_MS)

  try {
    const origin = new URL(sourceUrl).origin
    const response = await fetch(origin, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ShipyardHQ-ImageIngest/1.0",
      },
      signal: controller.signal,
    })

    if (!response.ok) return []
    const contentType = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase()
    if (contentType && !contentType.includes("html")) return []

    const html = await response.text()
    const urls: string[] = []
    const linkPattern = /<link\b[^>]*>/gi
    let match: RegExpExecArray | null

    while ((match = linkPattern.exec(html))) {
      const tag = match[0]
      const rel = getTagAttribute(tag, "rel")?.toLowerCase()
      const href = getTagAttribute(tag, "href")
      if (!rel || !href) continue
      if (!/\b(?:apple-touch-icon|icon|shortcut icon)\b/.test(rel)) continue

      try {
        urls.push(new URL(href, origin).href)
      } catch {
        // Ignore malformed icon hrefs from third-party pages.
      }
    }

    return urls
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

async function fallbackImageUrls(sourceUrl: string) {
  const [discoveredUrls] = await Promise.all([discoverIconLinkUrls(sourceUrl)])
  return uniqueUrls(
    [...discoveredUrls, ...commonIconFallbackUrls(sourceUrl)],
    sourceUrl,
  )
}

async function downloadImage(sourceUrl: string): Promise<DownloadedImage> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    let response: Response
    try {
      response = await fetch(sourceUrl, {
        headers: {
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          "User-Agent": "ShipyardHQ-ImageIngest/1.0",
        },
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Fetch timed out after ${FETCH_TIMEOUT_MS}ms`)
      }

      const cause = (error as { cause?: { code?: string; message?: string } })
        ?.cause
      const details = [cause?.code, cause?.message].filter(Boolean).join(" ")
      throw new Error(details ? `Fetch failed: ${details}` : "Fetch failed")
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const contentType = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase()

    if (!isAcceptableImageResponse(contentType)) {
      throw new Error(`Unsupported content type: ${contentType}`)
    }

    const contentLength = Number(response.headers.get("content-length") || 0)
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(`Image is larger than ${MAX_DOWNLOAD_BYTES} bytes`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
      throw new Error(`Image is larger than ${MAX_DOWNLOAD_BYTES} bytes`)
    }

    return { buffer, contentType }
  } finally {
    clearTimeout(timeout)
  }
}

async function optimizeImage(
  image: DownloadedImage,
  candidate: Candidate,
  format: OutputFormat,
): Promise<ProcessedImage> {
  const pipeline = sharp(image.buffer, {
    animated: false,
    limitInputPixels: 50_000_000,
  })
    .rotate()
    .resize({
      fit: "inside",
      height: candidate.maxHeight,
      width: candidate.maxWidth,
      withoutEnlargement: true,
    })

  if (format === "avif") {
    return {
      buffer: await pipeline
        .avif({ effort: 4, quality: Math.min(candidate.quality, 60) })
        .toBuffer(),
      contentType: "image/avif",
      extension: "avif",
    }
  }

  return {
    buffer: await pipeline
      .webp({ effort: 5, quality: candidate.quality, smartSubsample: true })
      .toBuffer(),
    contentType: "image/webp",
    extension: "webp",
  }
}

async function downloadOptimizedImage(
  candidate: Candidate,
  format: OutputFormat,
): Promise<ProcessedImage & { originalBytes: number; sourceUrl: string }> {
  const fallbackUrls: string[] = []
  const attemptedUrls = new Set<string>()
  let firstError: unknown
  let index = 0

  while (index === 0 || index <= fallbackUrls.length) {
    const sourceUrl =
      index === 0 ? candidate.sourceUrl : fallbackUrls[index - 1]
    index += 1

    if (attemptedUrls.has(sourceUrl)) continue
    attemptedUrls.add(sourceUrl)

    try {
      const downloaded = await downloadImage(sourceUrl)
      const processed = await optimizeImage(downloaded, candidate, format)
      return {
        ...processed,
        originalBytes: downloaded.buffer.byteLength,
        sourceUrl,
      }
    } catch (error) {
      firstError ??= error

      const canUseFallbacks =
        fallbackUrls.length === 0 &&
        (isLikelyFaviconUrl(candidate.sourceUrl) ||
          isUnsupportedImageError(error))

      if (canUseFallbacks) {
        fallbackUrls.push(...(await fallbackImageUrls(candidate.sourceUrl)))
      }
    }
  }

  throw firstError instanceof Error ? firstError : new Error(String(firstError))
}

function buildR2Key(
  candidate: Candidate,
  processed: ProcessedImage,
  sourceUrl = candidate.sourceUrl,
) {
  const base = basenameFromUrl(sourceUrl, candidate.label)
  const sourceHash = hash(sourceUrl).slice(0, 10)
  const contentHash = hash(processed.buffer).slice(0, 10)
  return `${candidate.keyPrefix}/${sourceHash}-${contentHash}-${base}.${processed.extension}`
}

function productOwnerPrefix(product: {
  id: string
  user: { clerkId: string | null } | null
  userId: string
}) {
  return product.user?.clerkId?.trim() || product.userId
}

async function collectCandidates(args: Args): Promise<{
  candidates: Candidate[]
  disconnect: () => Promise<void>
}> {
  loadEnvConfig(process.cwd())

  const { default: prisma } = await import("@/lib/prisma")
  const managedHosts = getManagedMediaHosts()
  const candidates: Candidate[] = []

  const products = await prisma.product.findMany({
    select: {
      ProductMedia: args.logosOnly
        ? false
        : {
            select: {
              altText: true,
              id: true,
              imageUrl: true,
              productId: true,
            },
          },
      bannerImage: true,
      id: true,
      logo: true,
      name: true,
      slug: true,
      user: { select: { clerkId: true } },
      userId: true,
    },
  })

  for (const product of products) {
    const ownerPrefix = productOwnerPrefix(product)
    const productPrefix = `${ownerPrefix}/products/${product.id}`
    const logoUrl = normalizeExternalImageUrl(product.logo, managedHosts)

    if (logoUrl) {
      candidates.push({
        id: product.id,
        keyPrefix: `${productPrefix}/logos`,
        kind: "product-logo",
        label: compactLabel(`${product.name} logo`),
        maxHeight: 512,
        maxWidth: 512,
        quality: 82,
        sourceUrl: logoUrl,
        update: (url) =>
          prisma.product.update({
            data: { logo: url },
            where: { id: product.id },
          }),
      })
    }

    if (!args.logosOnly && product.bannerImage) {
      const bannerUrl = normalizeExternalImageUrl(
        product.bannerImage,
        managedHosts,
      )
      if (bannerUrl) {
        candidates.push({
          id: product.id,
          keyPrefix: `${productPrefix}/banners`,
          kind: "product-banner",
          label: compactLabel(`${product.name} banner`),
          maxHeight: 900,
          maxWidth: 1600,
          quality: 82,
          sourceUrl: bannerUrl,
          update: (url) =>
            prisma.product.update({
              data: { bannerImage: url },
              where: { id: product.id },
            }),
        })
      }
    }

    if (!args.logosOnly) {
      for (const media of product.ProductMedia) {
        const mediaUrl = normalizeExternalImageUrl(media.imageUrl, managedHosts)
        if (!mediaUrl) continue

        candidates.push({
          id: media.id,
          keyPrefix: `${productPrefix}/media`,
          kind: "product-media",
          label: compactLabel(media.altText || `${product.name} media`),
          maxHeight: 1200,
          maxWidth: 1600,
          quality: 82,
          sourceUrl: mediaUrl,
          update: (url) =>
            prisma.productMedia.update({
              data: { imageUrl: url },
              where: { id: media.id },
            }),
        })
      }
    }
  }

  const alternatives = await prisma.alternativeProduct.findMany({
    select: {
      id: true,
      logoUrl: true,
      name: true,
    },
  })

  for (const alternative of alternatives) {
    const logoUrl = normalizeExternalImageUrl(alternative.logoUrl, managedHosts)
    if (!logoUrl) continue

    candidates.push({
      id: alternative.id,
      keyPrefix: `global/alternatives/${alternative.id}/logos`,
      kind: "alternative-logo",
      label: compactLabel(`${alternative.name} logo`),
      maxHeight: 512,
      maxWidth: 512,
      quality: 82,
      sourceUrl: logoUrl,
      update: (url) =>
        prisma.alternativeProduct.update({
          data: { logoUrl: url },
          where: { id: alternative.id },
        }),
    })
  }

  return {
    candidates: args.limit ? candidates.slice(0, args.limit) : candidates,
    disconnect: () => prisma.$disconnect(),
  }
}

async function runConcurrent<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let nextIndex = 0
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(items.length, 1)) },
      async () => {
        while (nextIndex < items.length) {
          const index = nextIndex
          nextIndex += 1
          await worker(items[index], index)
        }
      },
    ),
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printUsage()
    return
  }

  const { candidates, disconnect } = await collectCandidates(args)

  try {
    if (!candidates.length) {
      console.log("No external image URLs found.")
      return
    }

    console.log(
      `${args.apply ? "Applying" : "Dry run:"} ${candidates.length} external image candidate(s).`,
    )

    if (!args.apply) {
      for (const candidate of candidates) {
        console.log(
          `- ${candidate.kind} ${candidate.id}: ${candidate.sourceUrl}`,
        )
      }
      console.log("\nRun with --apply to upload to R2 and update records.")
      return
    }

    const { putBlob } = await import("@/lib/blob")
    const uploadCache = new Map<string, Promise<UploadResult>>()
    const failures: { candidate: Candidate; error: unknown }[] = []
    let updated = 0
    let uploaded = 0
    let reused = 0
    let originalBytes = 0
    let optimizedBytes = 0

    async function uploadCandidate(candidate: Candidate) {
      const cacheKey = [
        candidate.keyPrefix,
        candidate.maxWidth,
        candidate.maxHeight,
        args.format,
        candidate.sourceUrl,
      ].join("|")

      let uploadPromise = uploadCache.get(cacheKey)
      if (!uploadPromise) {
        uploadPromise = (async () => {
          const processed = await downloadOptimizedImage(candidate, args.format)
          const key = buildR2Key(candidate, processed, processed.sourceUrl)
          const result = await putBlob(key, processed.buffer, {
            access: "public",
            contentType: processed.contentType,
          })

          originalBytes += processed.originalBytes
          optimizedBytes += processed.buffer.byteLength
          uploaded += 1

          return {
            bytes: result.size,
            reused: false,
            sourceUrl: processed.sourceUrl,
            url: result.url,
          }
        })()
        uploadCache.set(cacheKey, uploadPromise)
      }

      const result = await uploadPromise
      await candidate.update(result.url)
      if (result.reused) reused += 1
      updated += 1

      const sourceNote =
        result.sourceUrl === candidate.sourceUrl
          ? ""
          : ` from ${result.sourceUrl}`
      console.log(
        `- updated ${candidate.kind} ${candidate.id}: ${result.bytes} bytes${sourceNote}`,
      )
    }

    await runConcurrent(candidates, args.concurrency, async (candidate) => {
      try {
        await uploadCandidate(candidate)
      } catch (error) {
        failures.push({ candidate, error })
        console.error(
          `- failed ${candidate.kind} ${candidate.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    })

    const saved = Math.max(0, originalBytes - optimizedBytes)
    console.log("\nSummary")
    console.log(`Updated records: ${updated}`)
    console.log(`Uploaded assets: ${uploaded}`)
    console.log(`Reused uploads: ${reused}`)
    console.log(`Original bytes downloaded: ${originalBytes}`)
    console.log(`Optimized bytes uploaded: ${optimizedBytes}`)
    console.log(`Estimated bytes removed from hotlinks: ${saved}`)
    console.log(`Failures: ${failures.length}`)

    if (failures.length && args.strict) {
      process.exitCode = 1
    }
  } finally {
    await disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
