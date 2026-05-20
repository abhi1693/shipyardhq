import { markdownResponse } from "@/lib/server/markdownForAgentsRoute"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET(req: Request) {
  return markdownResponse(req, true)
}

export function HEAD(req: Request) {
  return markdownResponse(req, false)
}
