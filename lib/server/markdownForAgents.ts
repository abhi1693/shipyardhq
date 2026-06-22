import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

type MarkdownResult = {
  body: string
  status?: number
}

const SELF_FETCH_ACCEPT_HEADER = "*/*"
const MAX_MARKDOWN_FETCH_REDIRECTS = 5
const MARKDOWN_FETCH_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  bulletListMarker: "-",
})
turndown.use(gfm)

export function estimateMarkdownTokens(markdown: string) {
  const trimmed = markdown.trim()
  return trimmed ? Math.max(1, Math.ceil(trimmed.length / 4)) : 0
}

export function hasExplicitMarkdownAccept(acceptHeader: string | null) {
  if (!acceptHeader) return false

  return acceptHeader.split(",").some((entry) => {
    const [mediaType, ...params] = entry
      .split(";")
      .map((part) => part.trim().toLowerCase())
    const qParam = params.find((param) => param.startsWith("q="))
    const q = qParam ? Number(qParam.slice(2)) : 1

    return mediaType === "text/markdown" && Number.isFinite(q) && q > 0
  })
}

function extractBody(html: string) {
  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
}

function normalizeHtml(html: string) {
  return extractBody(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, "")
}

function isAbsoluteOrSpecialUrl(url: string) {
  return /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(url)
}

function absolutizeMarkdownLinks(markdown: string, baseUrl: URL) {
  return markdown.replace(
    /(\]\()([^)\s]+)(\))/g,
    (match, open, href, close) => {
      if (isAbsoluteOrSpecialUrl(href)) return match

      try {
        return `${open}${new URL(href, baseUrl).toString()}${close}`
      } catch {
        return match
      }
    },
  )
}

function normalizeMarkdown(markdown: string, baseUrl: URL) {
  return (
    absolutizeMarkdownLinks(markdown, baseUrl)
      .replace(/\[\]\([^)]+\)/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim() + "\n"
  )
}

export function convertHtmlToMarkdown(html: string, baseUrl: URL) {
  return normalizeMarkdown(turndown.turndown(normalizeHtml(html)), baseUrl)
}

function isMarkdownRenderablePath(pathname: string) {
  return !(
    pathname.startsWith("/api/") ||
    pathname.startsWith("/member") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/sso-callback") ||
    pathname.startsWith("/markdown-for-agents") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/_next/")
  )
}

function isProductMarkdownPath(pathname: string) {
  return /^\/products\/[^/]+\/?$/.test(pathname)
}

async function fetchMarkdownHtmlTarget(
  targetUrl: URL,
): Promise<{ response: Response; finalUrl: URL } | null> {
  let currentUrl = targetUrl
  const visited = new Set<string>()

  for (let attempt = 0; attempt <= MAX_MARKDOWN_FETCH_REDIRECTS; attempt += 1) {
    if (visited.has(currentUrl.href)) {
      return null
    }
    visited.add(currentUrl.href)

    const response = await fetch(currentUrl, {
      headers: {
        Accept: SELF_FETCH_ACCEPT_HEADER,
      },
      redirect: "manual",
      cache: "no-store",
    })

    if (!MARKDOWN_FETCH_REDIRECT_STATUSES.has(response.status)) {
      return { response, finalUrl: currentUrl }
    }

    const location = response.headers.get("location")
    if (!location) {
      return { response, finalUrl: currentUrl }
    }

    const redirectUrl = new URL(location, currentUrl)
    if (
      redirectUrl.origin !== targetUrl.origin ||
      !isMarkdownRenderablePath(redirectUrl.pathname)
    ) {
      return null
    }

    currentUrl = redirectUrl
  }

  return null
}

export async function renderMarkdownForPath(
  targetUrl: URL,
): Promise<MarkdownResult | null> {
  if (!isMarkdownRenderablePath(targetUrl.pathname)) {
    return null
  }

  const { renderProductMarkdownForPath } =
    await import("@/lib/server/productMarkdown")
  const productMarkdown = await renderProductMarkdownForPath(targetUrl.pathname)
  if (productMarkdown) {
    return {
      body: productMarkdown,
      status: 200,
    }
  }
  if (isProductMarkdownPath(targetUrl.pathname)) {
    return null
  }

  const fetched = await fetchMarkdownHtmlTarget(targetUrl).catch(() => null)
  if (!fetched) return null

  const { response, finalUrl } = fetched
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.toLowerCase().includes("text/html")) {
    return null
  }

  const html = await response.text()
  const body = convertHtmlToMarkdown(html, finalUrl)

  return {
    body,
    status: response.status,
  }
}
