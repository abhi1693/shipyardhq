import { markdownResponse } from "@dualmark/core"
import { createDualmarkRouteHandler } from "@dualmark/nextjs"
import type { NextRequest } from "next/server"

import { dualmarkConfig, dualmarkExtraHeaders } from "@/lib/dualmark"
import { renderDirectoryMarkdownForPath } from "@/lib/server/directoryMarkdown"
import { renderProductMarkdownForPath } from "@/lib/server/productMarkdown"

type MarkdownPathContext = {
  params: Promise<{
    path?: string[]
  }>
}

const handler = createDualmarkRouteHandler(dualmarkConfig)

async function getPath(context: MarkdownPathContext) {
  const params = await context.params
  return `/${(params.path ?? []).map(encodeURIComponent).join("/")}`
}

function withoutBody(response: Response) {
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  })
}

async function productMarkdownResponse(path: string) {
  if (!/^\/products\/[^/]+\/?$/.test(path)) {
    return null
  }

  const body = await renderProductMarkdownForPath(path)
  if (!body) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": dualmarkConfig.headers.cacheControl,
        "X-Robots-Tag": "noindex",
      },
    })
  }

  return markdownResponse(body, {
    cacheControl: dualmarkConfig.headers.cacheControl,
    noindex: dualmarkConfig.headers.noindex,
    extraHeaders: dualmarkExtraHeaders,
  })
}

async function directoryMarkdownResponse(path: string) {
  const body = await renderDirectoryMarkdownForPath(path)
  if (!body) return null

  return markdownResponse(body, {
    cacheControl: dualmarkConfig.headers.cacheControl,
    noindex: dualmarkConfig.headers.noindex,
    extraHeaders: dualmarkExtraHeaders,
  })
}

export async function GET(req: NextRequest, context: MarkdownPathContext) {
  const path = await getPath(context)
  const productResponse = await productMarkdownResponse(path)
  if (productResponse) {
    return productResponse
  }

  const directoryResponse = await directoryMarkdownResponse(path)
  if (directoryResponse) {
    return directoryResponse
  }

  return handler.GET(req, {
    params: context.params.then((params) => ({
      path: params.path ?? [],
    })),
  })
}

export async function HEAD(req: NextRequest, context: MarkdownPathContext) {
  return withoutBody(await GET(req, context))
}
