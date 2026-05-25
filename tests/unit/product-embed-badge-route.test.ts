import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const productMocks = vi.hoisted(() => ({
  getPublicProductMetaBySlug: vi.fn(),
}))

vi.mock("@/actions/public/products/actions", () => ({
  getPublicProductMetaBySlug: productMocks.getPublicProductMetaBySlug,
}))

import { GET } from "@/app/api/embed/products/[slug]/route"

async function callBadgeRoute(url: string, slug = "openclaw-mission-control") {
  return GET(new NextRequest(url), {
    params: Promise.resolve({ slug }),
  })
}

describe("product embed badge route", () => {
  beforeEach(() => {
    productMocks.getPublicProductMetaBySlug.mockReset()
    productMocks.getPublicProductMetaBySlug.mockResolvedValue({
      name: "OpenClaw Mission Control",
    })
  })

  it("renders generated PNG badges", async () => {
    const response = await callBadgeRoute(
      "https://shipyardhq.dev/api/embed/products/openclaw-mission-control?format=png&theme=light",
    )
    const buffer = Buffer.from(await response.arrayBuffer())
    const pngSignature = buffer.subarray(0, 8).toString("hex")
    const sharp = (await import("sharp")).default
    const metadata = await sharp(buffer).metadata()
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let darkTextPixels = 0
    for (let y = 64; y < 130; y += 1) {
      for (let x = 185; x < 390; x += 1) {
        const offset = (y * info.width + x) * info.channels
        const red = data[offset]
        const green = data[offset + 1]
        const blue = data[offset + 2]
        const alpha = data[offset + 3]
        if (alpha > 128 && red < 90 && green < 100 && blue < 125) {
          darkTextPixels += 1
        }
      }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/png")
    expect(pngSignature).toBe("89504e470d0a1a0a")
    expect(metadata.width).toBe(502)
    expect(metadata.height).toBe(164)
    expect(darkTextPixels).toBeGreaterThan(200)
  })

  it("renders compact SVG badges without embedding PNG font payloads", async () => {
    const response = await callBadgeRoute(
      "https://shipyardhq.dev/api/embed/products/openclaw-mission-control?format=svg&theme=dark",
    )
    const svg = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/svg+xml")
    expect(svg).toContain("FEATURED ON")
    expect(svg).toContain("ShipYard HQ")
    expect(svg).toContain("textLength=")
    expect(svg).toContain("clip-path=")
    expect(svg).toContain('x="190" y="39"')
    expect(svg).not.toContain("data:font/truetype")
  })

  it("returns 404 when the product is not public", async () => {
    productMocks.getPublicProductMetaBySlug.mockResolvedValueOnce(null)

    const response = await callBadgeRoute(
      "https://shipyardhq.dev/api/embed/products/missing-product?format=png",
      "missing-product",
    )

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Badge not found")
  })
})
