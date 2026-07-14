import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const markdownMocks = vi.hoisted(() => ({
  renderProductMarkdownForPath: vi.fn(),
  renderDirectoryMarkdownForPath: vi.fn(),
}))

vi.mock("@/lib/server/productMarkdown", () => ({
  renderProductMarkdownForPath: markdownMocks.renderProductMarkdownForPath,
}))

vi.mock("@/lib/server/directoryMarkdown", () => ({
  renderDirectoryMarkdownForPath: markdownMocks.renderDirectoryMarkdownForPath,
}))

import { GET } from "@/app/md/[...path]/route"
import { PRODUCT_MARKDOWN_CACHE_CONTROL } from "@/lib/public-cache"

describe("product markdown cache headers", () => {
  beforeEach(() => {
    markdownMocks.renderProductMarkdownForPath.mockReset()
    markdownMocks.renderDirectoryMarkdownForPath.mockReset()
  })

  it("does not cache plan-derived product markdown", async () => {
    markdownMocks.renderProductMarkdownForPath.mockResolvedValue(
      "# Example product\n",
    )

    const response = await GET(
      new NextRequest("https://shipyardhq.dev/md/products/example"),
      {
        params: Promise.resolve({ path: ["products", "example"] }),
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      PRODUCT_MARKDOWN_CACHE_CONTROL,
    )
  })
})
