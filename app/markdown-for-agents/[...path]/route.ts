import { markdownResponse } from "@/lib/server/markdownForAgentsRoute"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type MarkdownPathContext = {
  params: Promise<{
    path?: string[]
  }>
}

async function getPathOverride(context: MarkdownPathContext) {
  const params = await context.params
  return `/${(params.path ?? []).map(encodeURIComponent).join("/")}`
}

export async function GET(req: Request, context: MarkdownPathContext) {
  return markdownResponse(req, true, await getPathOverride(context))
}

export async function HEAD(req: Request, context: MarkdownPathContext) {
  return markdownResponse(req, false, await getPathOverride(context))
}
