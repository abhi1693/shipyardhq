import {
  estimateMarkdownTokens,
  renderMarkdownForPath,
} from "@/lib/server/markdownForAgents"

const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8"

function validateRelativePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return null
  }

  return path
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

function getRequestOrigin(req: Request) {
  const requestUrl = new URL(req.url)
  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"))
  const host = forwardedHost || req.headers.get("host") || requestUrl.host
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"))
  const proto = forwardedProto || requestUrl.protocol.replace(/:$/, "")

  return `${proto}://${host}`
}

function getTargetUrl(req: Request, pathOverride?: string) {
  const requestUrl = new URL(req.url)
  const origin = getRequestOrigin(req)

  if (pathOverride) {
    const path = validateRelativePath(pathOverride)
    return path ? new URL(`${path}${requestUrl.search}`, origin) : null
  }

  const pathParam = requestUrl.searchParams.get("path")
  if (pathParam) {
    const path = validateRelativePath(pathParam)
    return path ? new URL(path, origin) : null
  }

  return new URL(`/${requestUrl.search}`, origin)
}

function markdownHeaders(markdown: string) {
  return {
    "Content-Type": MARKDOWN_CONTENT_TYPE,
    Vary: "Accept",
    "x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
    "X-Robots-Tag": "noindex",
    Link: [
      '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; profile="https://www.rfc-editor.org/info/rfc9727"',
      '</llms.txt>; rel="service-doc"; type="text/plain"',
    ].join(", "),
  }
}

export async function markdownResponse(
  req: Request,
  includeBody: boolean,
  pathOverride?: string,
) {
  const targetUrl = getTargetUrl(req, pathOverride)
  if (!targetUrl) {
    return new Response("Invalid markdown target\n", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  const result = await renderMarkdownForPath(targetUrl)
  if (!result) {
    return new Response("Markdown content not found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "Accept",
        "X-Robots-Tag": "noindex",
      },
    })
  }

  return new Response(includeBody ? result.body : null, {
    status: result.status ?? 200,
    headers: markdownHeaders(result.body),
  })
}
