import { createHash } from "crypto"
import { parseStringPromise } from "xml2js"

import {
  DEFAULT_CRAWLER_OPTIONS,
  ProductIdeaCrawlerOptions,
  ProductIdeaCrawlResult,
  ProductIdeaPageSnapshot,
  SitemapDiscovery,
} from "./types"

const HTML_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "application/xml",
]

const SUPPORTED_EXTENSIONS = new Set([
  "",
  "html",
  "htm",
  "php",
  "asp",
  "aspx",
  "jsp",
  "cfm",
])

const MAX_METADATA_ENTRIES = 24
const MAX_HEADINGS = 12
const MAX_TEXT_SNIPPET_LENGTH = 2400

function ensureAbsoluteUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim()
  if (!trimmed) throw new Error("Empty URL")
  try {
    return new URL(trimmed)
  } catch {
    return new URL(`https://${trimmed}`)
  }
}

function safeParseUrl(rawUrl: string, base?: string | URL): URL | null {
  try {
    return base ? new URL(rawUrl, base) : new URL(rawUrl)
  } catch {
    return null
  }
}

function isSameDomain(target: URL, base: URL): boolean {
  if (target.hostname === base.hostname) return true
  if (target.hostname.endsWith(`.${base.hostname}`)) return true
  return false
}

function shouldCrawlUrl(target: URL, base: URL): boolean {
  if (!isSameDomain(target, base)) return false
  const match = target.pathname.match(/\.([a-z0-9]+)$/i)
  const extension = match ? match[1].toLowerCase() : ""
  if (extension && !SUPPORTED_EXTENSIONS.has(extension)) return false
  return true
}

async function fetchWithTimeout(
  url: string,
  options: ProductIdeaCrawlerOptions,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(1000, options.pageFetchTimeoutMs),
  )
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": options.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1",
      },
      redirect: "follow",
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\s\u00A0]+/g, " ")
    .trim()
}

function stripTagValue(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

function extractHeadings(html: string): string[] {
  const regex = /<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/gi
  const headings: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(html))) {
    const heading = stripTagValue(match[2])
    if (heading) headings.push(heading)
    if (headings.length >= MAX_HEADINGS) break
  }
  return headings
}

type MetaTag = Record<string, string>

function parseMetaTags(html: string): MetaTag[] {
  const tags: MetaTag[] = []
  const metaRegex = /<meta\s+[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = metaRegex.exec(html))) {
    const raw = match[0]
    const attrs: MetaTag = {}
    const attrRegex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
    let attrMatch: RegExpExecArray | null
    while ((attrMatch = attrRegex.exec(raw))) {
      const [, key, dq, sq, bare] = attrMatch
      if (!key) continue
      const normalizedKey = key.toLowerCase()
      const value = (dq ?? sq ?? bare ?? "").trim()
      if (!normalizedKey || !value) continue
      attrs[normalizedKey] = value
    }
    if (Object.keys(attrs).length) tags.push(attrs)
    if (tags.length >= MAX_METADATA_ENTRIES) break
  }
  return tags
}

function extractMetaValue(tags: MetaTag[], key: string): string | undefined {
  const target = key.toLowerCase()
  for (const attrs of tags) {
    if (attrs.name?.toLowerCase() === target) return attrs.content
    if (attrs.property?.toLowerCase() === target) return attrs.content
  }
  return undefined
}

function extractKeywords(tags: MetaTag[]): string[] {
  const raw = extractMetaValue(tags, "keywords")
  if (!raw) return []
  return raw
    .split(/[,;\n\r]+/)
    .map((kw) => kw.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function extractJsonLd(html: string): unknown[] {
  const scripts: unknown[] = []
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html))) {
    const raw = match[1]?.trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      scripts.push(parsed)
    } catch {
      continue
    }
    if (scripts.length >= 16) break
  }
  return scripts
}

async function discoverSitemaps(
  baseUrl: URL,
  options: ProductIdeaCrawlerOptions,
): Promise<SitemapDiscovery> {
  const candidates = new Set<string>()
  const robotsUrl = new URL("/robots.txt", baseUrl)
  try {
    console.info("[productIdeas:crawler] fetching robots.txt", {
      robotsUrl: robotsUrl.toString(),
    })
    const response = await fetchWithTimeout(robotsUrl.toString(), options)
    if (response.ok) {
      const text = await response.text()
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        const match = line.match(/^sitemap:\s*(.+)$/i)
        if (!match) continue
        const sitemapUrl = safeParseUrl(match[1].trim(), baseUrl)
        if (sitemapUrl && isSameDomain(sitemapUrl, baseUrl)) {
          candidates.add(sitemapUrl.toString())
        }
      }
    }
  } catch {
    // Swallow robots errors silently
  }

  candidates.add(new URL("/sitemap.xml", baseUrl).toString())

  const processed = new Set<string>()
  const queue: string[] = Array.from(candidates)
  const discoveredUrls: string[] = []
  let primarySitemap: string | undefined

  while (queue.length && processed.size < options.maxSitemaps) {
    const target = queue.shift()!
    if (processed.has(target)) continue
    processed.add(target)
    let response: Response
    try {
      console.info("[productIdeas:crawler] fetching sitemap", { url: target })
      response = await fetchWithTimeout(target, options)
    } catch {
      continue
    }
    if (!response.ok) continue
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("xml")) continue
    const xml = await response.text()
    let parsed: any
    try {
      parsed = await parseStringPromise(xml, {
        explicitArray: false,
        normalize: true,
        trim: true,
      })
    } catch {
      continue
    }

    if (!primarySitemap) primarySitemap = target

    const urlset = parsed?.urlset?.url
    if (urlset) {
      const urlsArray = Array.isArray(urlset) ? urlset : [urlset]
      for (const entry of urlsArray) {
        const loc = (entry?.loc ?? "").toString().trim()
        if (!loc) continue
        const parsedUrl = safeParseUrl(loc)
        if (!parsedUrl) continue
        if (!shouldCrawlUrl(parsedUrl, baseUrl)) continue
        discoveredUrls.push(parsedUrl.toString())
        if (discoveredUrls.length >= options.maxPages * 3) break
      }
    }

    if (discoveredUrls.length >= options.maxPages * 3) break

    const sitemapIndex = parsed?.sitemapindex?.sitemap
    if (sitemapIndex) {
      const entries = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex]
      for (const entry of entries) {
        const loc = (entry?.loc ?? "").toString().trim()
        if (!loc) continue
        const parsedUrl = safeParseUrl(loc)
        if (!parsedUrl) continue
        if (!isSameDomain(parsedUrl, baseUrl)) continue
        queue.push(parsedUrl.toString())
      }
    }
  }

  return {
    sitemapUrl: primarySitemap,
    urls: discoveredUrls,
  }
}

async function fetchPageSnapshot(
  url: string,
  options: ProductIdeaCrawlerOptions,
): Promise<ProductIdeaPageSnapshot> {
  const started = Date.now()
  const fetchedAt = new Date().toISOString()
  console.info("[productIdeas:crawler] fetching page", { url })
  try {
    const response = await fetchWithTimeout(url, options)
    const duration = Date.now() - started
    const contentType = response.headers.get("content-type") || null
    const snapshot: ProductIdeaPageSnapshot = {
      url,
      finalUrl: response.url || url,
      status: response.ok ? "ok" : "error",
      statusCode: response.status,
      contentType,
      fetchedAt,
      fetchDurationMs: duration,
    }

    if (!response.ok) {
      snapshot.error = `Request failed with status ${response.status}`
      return snapshot
    }

    if (
      contentType &&
      !HTML_CONTENT_TYPES.some((type) => contentType.includes(type))
    ) {
      snapshot.status = "error"
      snapshot.error = `Unsupported content-type: ${contentType}`
      return snapshot
    }

    const html = await response.text()
    const metaTags = parseMetaTags(html)
    const keywords = extractKeywords(metaTags)
    const headings = extractHeadings(html)
    const textContent = stripHtml(html)
    const snippet = textContent.slice(0, MAX_TEXT_SNIPPET_LENGTH)
    const hash = createHash("sha256").update(textContent).digest("hex")

    const metadataMap: Record<string, string> = {}
    for (const meta of metaTags) {
      const key = meta.name || meta.property
      if (!key || metadataMap[key]) continue
      if (meta.content) {
        metadataMap[key] = meta.content
      }
      if (Object.keys(metadataMap).length >= MAX_METADATA_ENTRIES) break
    }

    snapshot.title = extractTitle(html)
    snapshot.metaDescription = extractMetaValue(metaTags, "description")
    snapshot.ogTitle = extractMetaValue(metaTags, "og:title")
    snapshot.ogDescription = extractMetaValue(metaTags, "og:description")
    snapshot.twitterTitle = extractMetaValue(metaTags, "twitter:title")
    snapshot.twitterDescription = extractMetaValue(
      metaTags,
      "twitter:description",
    )
    snapshot.keywords = keywords
    snapshot.headings = headings
    snapshot.textSnippet = snippet
    snapshot.rawTextLength = textContent.length
    snapshot.contentHash = hash
    snapshot.metadata = metadataMap
    snapshot.jsonLd = extractJsonLd(html)

    return snapshot
  } catch (error) {
    const snapshot: ProductIdeaPageSnapshot = {
      url,
      status: "error",
      fetchedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    }
    if (error instanceof Error && /abort/i.test(error.name)) {
      snapshot.error = "Request timed out"
    }
    return snapshot
  }
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : undefined
}

export async function crawlProductWebsite(
  websiteUrl: string,
  overrideOptions?: Partial<ProductIdeaCrawlerOptions>,
): Promise<ProductIdeaCrawlResult> {
  const baseUrl = ensureAbsoluteUrl(websiteUrl)
  console.info("[productIdeas:crawler] starting crawl", {
    baseUrl: baseUrl.toString(),
  })
  const options: ProductIdeaCrawlerOptions = {
    ...DEFAULT_CRAWLER_OPTIONS,
    ...overrideOptions,
  }

  const discovery = await discoverSitemaps(baseUrl, options)
  console.info("[productIdeas:crawler] sitemap discovery complete", {
    sitemapUrl: discovery.sitemapUrl,
    discoveredUrlCount: discovery.urls.length,
  })
  const homepage = new URL(baseUrl.pathname || "/", baseUrl.origin).toString()

  const deduped = new Set<string>([homepage])
  for (const url of discovery.urls) {
    deduped.add(url)
    if (deduped.size >= options.maxPages) break
  }
  const targetUrls = Array.from(deduped).slice(0, options.maxPages)

  const pages: ProductIdeaPageSnapshot[] = []
  for (const url of targetUrls) {
    const snapshot = await fetchPageSnapshot(url, options)
    console.info("[productIdeas:crawler] page fetched", {
      url: snapshot.url,
      status: snapshot.status,
      statusCode: snapshot.statusCode,
      durationMs: snapshot.fetchDurationMs,
    })
    pages.push(snapshot)
  }

  console.info("[productIdeas:crawler] crawl finished", {
    pageCount: pages.length,
  })

  return {
    baseUrl: baseUrl.toString(),
    sitemapUrl: discovery.sitemapUrl,
    discoveredUrls: discovery.urls.slice(0, options.maxPages),
    fetchedAt: new Date().toISOString(),
    pages,
  }
}
