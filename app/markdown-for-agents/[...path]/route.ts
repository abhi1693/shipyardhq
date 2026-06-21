import type { NextRequest } from "next/server"

import { markdownResponse } from "@/lib/server/markdownForAgentsRoute"

type MarkdownPathContext = {
  params: Promise<{
    path?: string[]
  }>
}

async function getPathOverride(context: MarkdownPathContext) {
  const params = await context.params
  return `/${(params.path ?? []).map(encodeURIComponent).join("/")}`
}

export async function GET(req: NextRequest, context: MarkdownPathContext) {
  return markdownResponse(req, true, await getPathOverride(context))
}

export async function HEAD(req: NextRequest, context: MarkdownPathContext) {
  return markdownResponse(req, false, await getPathOverride(context))
}
