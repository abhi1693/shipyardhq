import {
  normalizeImageQuality,
  normalizeImageWidth,
  parseManagedMediaImageUrl,
} from "./managed-media"

type ImgproxyConfig = {
  endpoint?: string
  key?: string
  salt?: string
}

type ImgproxyImageParams = {
  src: string
  width: number
  quality?: number | string | null
}

type ResponsiveImgproxyImageParams = {
  src: string
  widths: number[]
  defaultWidth: number
  quality?: number | string | null
}

const textEncoder = new TextEncoder()

function getPrimarySecret(secret: string | undefined) {
  return secret?.split(",")[0]?.trim()
}

function readImgproxyConfig(): ImgproxyConfig {
  return {
    endpoint: process.env.IMGPROXY_ENDPOINT,
    key: getPrimarySecret(process.env.IMGPROXY_KEY),
    salt: getPrimarySecret(process.env.IMGPROXY_SALT),
  }
}

function parseImgproxyEndpoint(endpoint: string | undefined) {
  if (!endpoint) return null

  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return null
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    return null
  }

  url.pathname = url.pathname.replace(/\/+$/, "")
  url.search = ""
  url.hash = ""

  return url.toString().replace(/\/+$/, "")
}

function decodeHexSecret(secret: string | undefined) {
  if (!secret || secret.length % 2 !== 0 || !/^[\da-f]+$/i.test(secret)) {
    return null
  }

  const bytes = new Uint8Array(secret.length / 2)
  for (let index = 0; index < secret.length; index += 2) {
    bytes[index / 2] = Number.parseInt(secret.slice(index, index + 2), 16)
  }

  return bytes
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)

  return copy.buffer
}

async function signImgproxyPath(
  path: string,
  key: Uint8Array,
  salt: Uint8Array,
) {
  const payload = new Uint8Array(salt.length + textEncoder.encode(path).length)
  payload.set(salt)
  payload.set(textEncoder.encode(path), salt.length)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    toArrayBuffer(payload),
  )

  return base64UrlEncode(new Uint8Array(signature))
}

export async function buildSignedImgproxyImageUrl(
  { src, width, quality }: ImgproxyImageParams,
  config: ImgproxyConfig = readImgproxyConfig(),
) {
  const sourceUrl = parseManagedMediaImageUrl(src)
  if (!sourceUrl) return null

  const endpoint = parseImgproxyEndpoint(config.endpoint)
  const key = decodeHexSecret(config.key)
  const salt = decodeHexSecret(config.salt)
  if (!endpoint || !key || !salt) {
    return null
  }

  const options = [
    `rs:fit:${normalizeImageWidth(width)}:0:0`,
    `q:${normalizeImageQuality(quality)}`,
    "sm:1",
    "f:webp",
  ]
  const encodedSourceUrl = base64UrlEncode(textEncoder.encode(sourceUrl.href))
  const path = `/${options.join("/")}/${encodedSourceUrl}`
  const signature = await signImgproxyPath(path, key, salt)

  return `${endpoint}/${signature}${path}`
}

export async function buildSignedImgproxyResponsiveImage(
  { src, widths, defaultWidth, quality }: ResponsiveImgproxyImageParams,
  config: ImgproxyConfig = readImgproxyConfig(),
) {
  const normalizedWidths = Array.from(
    new Set(widths.map((width) => normalizeImageWidth(width))),
  ).sort((a, b) => a - b)

  if (!normalizedWidths.length) {
    return null
  }

  const entries = await Promise.all(
    normalizedWidths.map(async (width) => {
      const url = await buildSignedImgproxyImageUrl(
        { src, width, quality },
        config,
      )
      return url ? { width, url } : null
    }),
  )

  if (entries.some((entry) => entry === null)) {
    return null
  }

  const signedEntries = entries as Array<{ width: number; url: string }>
  const normalizedDefaultWidth = normalizeImageWidth(defaultWidth)
  const defaultEntry =
    signedEntries.find((entry) => entry.width === normalizedDefaultWidth) ??
    signedEntries.find((entry) => entry.width >= normalizedDefaultWidth) ??
    signedEntries.at(-1)

  if (!defaultEntry) {
    return null
  }

  return {
    src: defaultEntry.url,
    srcSet: signedEntries
      .map((entry) => `${entry.url} ${entry.width}w`)
      .join(", "),
  }
}
