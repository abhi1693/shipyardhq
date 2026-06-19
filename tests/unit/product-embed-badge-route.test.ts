import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    product: {
      findUnique: prismaMocks.findUnique,
    },
  },
}))

import { GET } from "@/app/api/embed/products/[slug]/route"
import { BRAND_NAME } from "@/lib/brand"

async function callBadgeRoute(url: string, slug = "openclaw-mission-control") {
  return GET(new NextRequest(url), {
    params: Promise.resolve({ slug }),
  })
}

describe("product embed badge route", () => {
  beforeEach(() => {
    prismaMocks.findUnique.mockReset()
    prismaMocks.findUnique.mockResolvedValue({
      name: "OpenClaw Mission Control",
    })
  })

  it("returns SVG badges even when PNG format is requested", async () => {
    const response = await callBadgeRoute(
      "https://shipyardhq.dev/api/embed/products/openclaw-mission-control?format=png&theme=light",
    )
    const svg = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/svg+xml")
    expect(svg).toContain("<svg")
    expect(svg).toContain("FEATURED ON")
    expect(svg).toContain(BRAND_NAME)
  })

  it("renders compact SVG badges without embedding PNG font payloads", async () => {
    const response = await callBadgeRoute(
      "https://shipyardhq.dev/api/embed/products/openclaw-mission-control?format=svg&theme=dark",
    )
    const svg = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/svg+xml")
    expect(svg).toContain("FEATURED ON")
    expect(svg).toContain(BRAND_NAME)
    expect(svg).toContain("textLength=")
    expect(svg).toContain("clip-path=")
    expect(svg).toContain('x="190" y="39"')
    expect(svg).not.toContain("data:font/truetype")
  })

  it("returns 404 when the product is not public", async () => {
    prismaMocks.findUnique.mockResolvedValueOnce(null)

    const response = await callBadgeRoute(
      "https://shipyardhq.dev/api/embed/products/missing-product?format=png",
      "missing-product",
    )

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Badge not found")
  })
})
