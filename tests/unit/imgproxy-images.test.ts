import { describe, expect, it } from "vitest"

import shipyardImageLoader from "@/imageLoader"
import { buildSignedImgproxyImageUrl } from "@/lib/images/imgproxy"
import {
  buildManagedMediaImageOptimizerUrl,
  buildRemoteImageOptimizerUrl,
  isManagedMediaImageSrc,
} from "@/lib/images/managed-media"
import { isOptimizedImageSrc } from "@/lib/images/sources"

describe("managed media image URLs", () => {
  it("builds a first-party optimizer URL for managed media images", () => {
    expect(
      buildManagedMediaImageOptimizerUrl({
        src: "https://media.shipyardhq.dev/user_1/products/p1/logos/logo.jpg?etag=abc",
        width: 64,
        quality: 80,
      }),
    ).toBe(
      "/_next/image?url=https%3A%2F%2Fmedia.shipyardhq.dev%2Fuser_1%2Fproducts%2Fp1%2Flogos%2Flogo.jpg%3Fetag%3Dabc&w=64&q=80",
    )
  })

  it("rounds widths, clamps abusive values, and defaults quality", () => {
    expect(
      buildManagedMediaImageOptimizerUrl({
        src: "https://media.shipyardhq.dev/logo.webp",
        width: 50000,
        quality: "not-a-number",
      }),
    ).toBe(
      "/_next/image?url=https%3A%2F%2Fmedia.shipyardhq.dev%2Flogo.webp&w=3840&q=75",
    )
  })

  it("leaves unsupported sources alone", () => {
    expect(isManagedMediaImageSrc("https://example.com/logo.jpg")).toBe(false)
    expect(
      buildManagedMediaImageOptimizerUrl({
        src: "https://example.com/logo.jpg",
        width: 64,
      }),
    ).toBe("https://example.com/logo.jpg")
  })

  it("builds a first-party optimizer URL for transformable remote images", () => {
    expect(
      buildRemoteImageOptimizerUrl({
        src: "https://example.com/logo.jpg?version=1",
        width: 64,
        quality: 75,
      }),
    ).toBe(
      "/_next/image?url=https%3A%2F%2Fexample.com%2Flogo.jpg%3Fversion%3D1&w=64&q=75",
    )
  })

  it("leaves unsupported remote image formats alone", () => {
    expect(
      buildRemoteImageOptimizerUrl({
        src: "https://example.com/favicon.ico",
        width: 40,
        quality: 75,
      }),
    ).toBe("https://example.com/favicon.ico")
  })

  it("leaves local sources untouched", () => {
    expect(
      shipyardImageLoader({
        src: "/brand.png",
        width: 64,
        quality: 75,
      }),
    ).toBe("/brand.png")
  })

  it("uses first-party optimizer URLs from the global loader for managed media", () => {
    expect(
      shipyardImageLoader({
        src: "https://media.shipyardhq.dev/logo.jpg",
        width: 64,
        quality: 75,
      }),
    ).toBe(
      "/_next/image?url=https%3A%2F%2Fmedia.shipyardhq.dev%2Flogo.jpg&w=64&q=75",
    )
  })

  it("uses first-party optimizer URLs for transformable remote images", () => {
    expect(
      shipyardImageLoader({
        src: "https://example.com/logo.jpg?version=1",
        width: 64,
        quality: 75,
      }),
    ).toBe(
      "/_next/image?url=https%3A%2F%2Fexample.com%2Flogo.jpg%3Fversion%3D1&w=64&q=75",
    )
  })

  it("falls back to size hints for unsupported remote images", () => {
    expect(
      shipyardImageLoader({
        src: "https://example.com/favicon.ico",
        width: 40,
        quality: 75,
      }),
    ).toBe("https://example.com/favicon.ico?w=40&q=75")
  })

  it("signs managed media redirects for imgproxy", async () => {
    const transformedUrl = await buildSignedImgproxyImageUrl(
      {
        src: "https://media.shipyardhq.dev/user_1/products/p1/logos/logo.jpg?etag=abc",
        width: 64,
        quality: 80,
      },
      {
        endpoint: "https://img.shipyardhq.dev",
        key: "736563726574",
        salt: "68656c6c6f",
      },
    )

    expect(transformedUrl).not.toBeNull()

    const url = new URL(transformedUrl ?? "")
    expect(url.origin).toBe("https://img.shipyardhq.dev")
    expect(url.pathname).toMatch(
      /^\/[^/]+\/rs:fit:64:0:0\/q:80\/sm:1\/f:webp\/[\w-]+$/,
    )
    expect(url.pathname).not.toContain("unsafe")
    expect(url.pathname).not.toContain("media.shipyardhq.dev")
  })

  it("does not sign without a complete imgproxy configuration", async () => {
    await expect(
      buildSignedImgproxyImageUrl(
        {
          src: "https://media.shipyardhq.dev/logo.jpg",
          width: 64,
          quality: 75,
        },
        {
          endpoint: "https://img.shipyardhq.dev",
          key: "736563726574",
        },
      ),
    ).resolves.toBeNull()
  })

  it("does not sign non-managed remote images", async () => {
    await expect(
      buildSignedImgproxyImageUrl(
        {
          src: "https://example.com/logo.jpg",
          width: 64,
          quality: 75,
        },
        {
          endpoint: "https://img.shipyardhq.dev",
          key: "736563726574",
          salt: "68656c6c6f",
        },
      ),
    ).resolves.toBeNull()
  })

  it("treats local and managed media as optimized image sources", () => {
    expect(isOptimizedImageSrc("/brand.svg")).toBe(true)
    expect(isOptimizedImageSrc("//example.com/logo.png")).toBe(false)
    expect(isOptimizedImageSrc("https://example.com/logo.png")).toBe(true)
    expect(isOptimizedImageSrc("https://example.com/favicon.ico")).toBe(false)
    expect(isOptimizedImageSrc("https://media.shipyardhq.dev/logo.png")).toBe(
      true,
    )
  })
})
