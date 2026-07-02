import { describe, expect, it } from "vitest"
import { markdownResponse } from "@dualmark/core"

import { GET as getLlmsTxt } from "@/app/llms.txt/route"
import { PUBLIC_CONTENT_CACHE_CONTROL } from "@/lib/public-cache"

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

  it("labels the archive sitemap accurately in llms.txt", async () => {
    const response = await getLlmsTxt()
    const body = await response.text()

    expect(body).toContain("Archive sitemap")
    expect(body).toContain("sitemap-archives.xml")
    expect(body).not.toContain("Categories sitemap")
  })

  it("sets public cache headers on Dualmark markdown responses", async () => {
    const response = markdownResponse("# Shipyard\n", {
      cacheControl: PUBLIC_CONTENT_CACHE_CONTROL,
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    )
    expect(response.headers.get("cache-control")).toBe(
      PUBLIC_CONTENT_CACHE_CONTROL,
    )
  })
})
