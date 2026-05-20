import { describe, expect, it } from "vitest"

import {
  buildCloudflareMediaImageUrl,
  isCloudflareMediaImageSrc,
} from "@/lib/images/cloudflare"
import shipyardImageLoader from "@/imageLoader"

describe("Cloudflare media image URLs", () => {
  it("builds a Cloudflare transformation URL for managed media images", () => {
    expect(
      buildCloudflareMediaImageUrl({
        src: "https://media.shipyardhq.dev/user_1/products/p1/logos/logo.jpg?etag=abc",
        width: 64,
        quality: 80,
      }),
    ).toBe(
      "https://media.shipyardhq.dev/cdn-cgi/image/width=64,quality=80,format=auto,metadata=none,onerror=redirect/user_1/products/p1/logos/logo.jpg?etag=abc",
    )
  })

  it("rounds widths and defaults quality", () => {
    expect(
      buildCloudflareMediaImageUrl({
        src: "https://media.shipyardhq.dev/logo.webp",
        width: 63.5,
      }),
    ).toBe(
      "https://media.shipyardhq.dev/cdn-cgi/image/width=64,quality=75,format=auto,metadata=none,onerror=redirect/logo.webp",
    )
  })

  it("leaves unsupported sources alone", () => {
    expect(isCloudflareMediaImageSrc("https://example.com/logo.jpg")).toBe(
      false,
    )
    expect(
      buildCloudflareMediaImageUrl({
        src: "https://example.com/logo.jpg",
        width: 64,
      }),
    ).toBe("https://example.com/logo.jpg")
  })

  it("uses Next image optimization for non-managed sources", () => {
    expect(
      shipyardImageLoader({
        src: "/brand.png",
        width: 64,
        quality: 75,
      }),
    ).toBe("/_next/image?url=%2Fbrand.png&w=64&q=75")
  })

  it("uses Cloudflare transformations from the global loader for managed media", () => {
    expect(
      shipyardImageLoader({
        src: "https://media.shipyardhq.dev/logo.jpg",
        width: 64,
        quality: 75,
      }),
    ).toBe(
      "https://media.shipyardhq.dev/cdn-cgi/image/width=64,quality=75,format=auto,metadata=none,onerror=redirect/logo.jpg",
    )
  })
})
