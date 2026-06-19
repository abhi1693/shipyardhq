import { describe, expect, it } from "vitest"

import shipyardImageLoader from "@/imageLoader"

describe("shipyard image loader", () => {
  it("leaves local images untouched", () => {
    expect(shipyardImageLoader({ src: "/brand.svg", width: 64 })).toBe(
      "/brand.svg",
    )
  })

  it("does not route unmanaged remote images through the internal optimizer", () => {
    expect(
      shipyardImageLoader({
        src: "https://placehold.co/600x400.png",
        width: 640,
        quality: 95,
      }),
    ).toBe("https://placehold.co/600x400.png")
  })

  it("routes managed media through the internal optimizer", () => {
    expect(
      shipyardImageLoader({
        src: "https://media.shipyardhq.dev/products/logo.png",
        width: 128,
        quality: 80,
      }),
    ).toBe(
      "/_next/image?url=https%3A%2F%2Fmedia.shipyardhq.dev%2Fproducts%2Flogo.png&w=128&q=80",
    )
  })
})
