import { describe, expect, it } from "vitest"

import { GET as getLlmsTxt } from "@/app/llms.txt/route"
import { PUBLIC_CONTENT_CACHE_CONTROL } from "@/lib/public-cache"
import { markdownResponse } from "@/lib/server/markdownForAgentsRoute"

describe("public docs cache headers", () => {
  it("sets public cache headers on llms.txt", async () => {
    const response = await getLlmsTxt()

    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    )
    expect(response.headers.get("cache-control")).toBe(
      PUBLIC_CONTENT_CACHE_CONTROL,
    )
  })

  it("sets public cache headers on markdown-for-agents responses", async () => {
    const response = await markdownResponse(
      new Request("https://shipyard.test/markdown-for-agents"),
      true,
      "//invalid",
    )

    expect(response.status).toBe(400)
    expect(response.headers.get("cache-control")).toBe(
      PUBLIC_CONTENT_CACHE_CONTROL,
    )
  })
})
