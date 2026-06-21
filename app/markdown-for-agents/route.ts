import { markdownResponse } from "@/lib/server/markdownForAgentsRoute"

export function GET(req: Request) {
  return markdownResponse(req, true)
}

export function HEAD(req: Request) {
  return markdownResponse(req, false)
}
