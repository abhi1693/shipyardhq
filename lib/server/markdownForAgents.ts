import TurndownService from "turndown"
import { gfm } from "turndown-plugin-gfm"

type MarkdownResult = {
  body: string
  status?: number
}

const HTML_ACCEPT_HEADER =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"

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

export async function renderMarkdownForPath(
  targetUrl: URL,
): Promise<MarkdownResult | null> {
  if (
    targetUrl.pathname.startsWith("/api/") ||
    targetUrl.pathname.startsWith("/admin") ||
    targetUrl.pathname.startsWith("/member") ||
    targetUrl.pathname.startsWith("/markdown-for-agents") ||
    targetUrl.pathname.startsWith("/.well-known/")
  ) {
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

  const response = await fetch(targetUrl, {
    headers: {
      Accept: HTML_ACCEPT_HEADER,
    },
    redirect: "follow",
    cache: "no-store",
  })

  const contentType = response.headers.get("content-type") || ""
  if (!contentType.toLowerCase().includes("text/html")) {
    return null
  }

  const html = await response.text()
  const body = convertHtmlToMarkdown(html, targetUrl)

  return {
    body,
    status: response.status,
  }
}
