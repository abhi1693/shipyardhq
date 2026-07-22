import "server-only"

import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const MAX_BYTES = 2_000_000
const TIMEOUT_MS = 12_000
const MAX_REDIRECTS = 5

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0]
  if (normalized.startsWith("::ffff:"))
    return isPrivateIpv4(normalized.slice(7))
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("2001:db8")
  )
}

export function isPrivateAddress(address: string) {
  const version = isIP(address)
  return version === 4
    ? isPrivateIpv4(address)
    : version === 6
      ? isPrivateIpv6(address)
      : true
}

export function normalizePublicUrl(raw: string) {
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(raw.trim())
    ? raw.trim()
    : `https://${raw.trim()}`
  const url = new URL(withProtocol)
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Enter a public HTTP or HTTPS URL.")
  if (
    !url.hostname ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local")
  )
    throw new Error("Private and local network URLs are not supported.")
  if (isIP(url.hostname) && isPrivateAddress(url.hostname))
    throw new Error("Private and local network URLs are not supported.")
  return url
}

async function assertPublicHost(url: URL) {
  if (isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname))
      throw new Error("Private and local network URLs are not supported.")
    return
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true })
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  )
    throw new Error(
      "The hostname resolves to a private or unsupported network.",
    )
}

async function readLimited(response: Response) {
  const length = Number(response.headers.get("content-length"))
  if (Number.isFinite(length) && length > MAX_BYTES)
    throw new Error("The response is larger than the 2 MB audit limit.")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      throw new Error("The response is larger than the 2 MB audit limit.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export type PublicFetchResult = {
  requestedUrl: string
  finalUrl: string
  status: number
  responseTimeMs: number
  contentType: string
  body: string
  sizeBytes: number
}

export async function fetchPublicResource(
  rawUrl: string,
  accept = "text/html,application/xhtml+xml",
): Promise<PublicFetchResult> {
  const requested = normalizePublicUrl(rawUrl)
  let current = requested
  const started = performance.now()
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicHost(current)
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Accept: accept,
        "User-Agent":
          "ShipyardHQ-SEO-Audit/1.0 (+https://shipyardhq.com/tools)",
      },
      cache: "no-store",
    })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location)
        throw new Error("The server returned a redirect without a destination.")
      current = new URL(location, current)
      if (!["http:", "https:"].includes(current.protocol))
        throw new Error("The page redirects to an unsupported protocol.")
      continue
    }
    const body = await readLimited(response)
    return {
      requestedUrl: requested.toString(),
      finalUrl: current.toString(),
      status: response.status,
      responseTimeMs: Math.round(performance.now() - started),
      contentType: response.headers.get("content-type") ?? "",
      body,
      sizeBytes: new TextEncoder().encode(body).byteLength,
    }
  }
  throw new Error("The page exceeded the redirect limit.")
}

export async function fetchPublicHtml(rawUrl: string) {
  const result = await fetchPublicResource(rawUrl)
  if (
    !result.contentType.toLowerCase().includes("text/html") &&
    !result.contentType.toLowerCase().includes("application/xhtml+xml")
  )
    throw new Error("The URL did not return an HTML document.")
  return result
}
