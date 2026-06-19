import { describe, expect, it } from "vitest"

import shipyardImageLoader from "@/imageLoader"
import {
  buildSignedImgproxyImageUrl,
  buildSignedImgproxyResponsiveImage,
} from "@/lib/images/imgproxy"
import {
  buildManagedMediaImageOptimizerUrl,
  buildRemoteImageOptimizerUrl,
  isManagedMediaImageSrc,
} from "@/lib/images/managed-media"
import { buildCachedTransformedImageKey } from "@/lib/server/images/cached-transform"
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

  it("treats the configured R2 public host as managed media", () => {
    const previousPublicBaseUrl = process.env.R2_PUBLIC_BASE_URL
    process.env.R2_PUBLIC_BASE_URL = "https://pub.example.r2.dev"

    try {
      expect(
        buildManagedMediaImageOptimizerUrl({
          src: "https://pub.example.r2.dev/products/logo.png",
          width: 128,
          quality: 80,
        }),
      ).toBe(
        "/_next/image?url=https%3A%2F%2Fpub.example.r2.dev%2Fproducts%2Flogo.png&w=128&q=80",
      )
    } finally {
      if (previousPublicBaseUrl === undefined) {
        delete process.env.R2_PUBLIC_BASE_URL
      } else {
        process.env.R2_PUBLIC_BASE_URL = previousPublicBaseUrl
      }
    }
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

  it("does not route unmanaged transformable remote images through the global loader", () => {
    expect(
      shipyardImageLoader({
        src: "https://example.com/logo.jpg?version=1",
        width: 64,
        quality: 75,
      }),
    ).toBe("https://example.com/logo.jpg?version=1")
  })

  it("leaves unsupported remote images untouched", () => {
    expect(
      shipyardImageLoader({
        src: "https://example.com/favicon.ico",
        width: 40,
        quality: 75,
      }),
    ).toBe("https://example.com/favicon.ico")
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

  it("builds signed responsive imgproxy image sources", async () => {
    const transformedImage = await buildSignedImgproxyResponsiveImage(
      {
        src: "https://media.shipyardhq.dev/user_1/products/p1/logos/logo.jpg?etag=abc",
        widths: [128, 64, 64],
        defaultWidth: 128,
        quality: 80,
      },
      {
        endpoint: "https://img.shipyardhq.dev",
        key: "736563726574",
        salt: "68656c6c6f",
      },
    )

    expect(transformedImage).not.toBeNull()
    expect(transformedImage?.src).toContain("https://img.shipyardhq.dev/")
    expect(transformedImage?.src).not.toContain("/_next/image")
    expect(transformedImage?.srcSet).toMatch(/rs:fit:64:0:0\/q:80/)
    expect(transformedImage?.srcSet).toMatch(/ 64w, /)
    expect(transformedImage?.srcSet).toMatch(/ 128w$/)
  })

  it("builds signed AVIF imgproxy image sources", async () => {
    const transformedImage = await buildSignedImgproxyResponsiveImage(
      {
        src: "https://media.shipyardhq.dev/global/pricing/dashboard-preview.webp",
        widths: [320, 512],
        defaultWidth: 512,
        format: "avif",
        quality: 48,
      },
      {
        endpoint: "https://img.shipyardhq.dev",
        key: "736563726574",
        salt: "68656c6c6f",
      },
    )

    expect(transformedImage).not.toBeNull()
    expect(transformedImage?.src).toContain("/f:avif/")
    expect(transformedImage?.srcSet).toMatch(/rs:fit:320:0:0\/q:48/)
    expect(transformedImage?.srcSet).toMatch(/ 320w, /)
    expect(transformedImage?.srcSet).toMatch(/ 512w$/)
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

  it("does not build responsive imgproxy sources without signing config", async () => {
    await expect(
      buildSignedImgproxyResponsiveImage(
        {
          src: "https://media.shipyardhq.dev/logo.jpg",
          widths: [64, 128],
          defaultWidth: 128,
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

  it("builds stable R2 cache keys for transformed managed images", () => {
    const params = {
      src: "https://media.shipyardhq.dev/user_1/products/p1/logos/logo.jpg?etag=abc",
      width: 64,
      quality: 80,
    }

    const cacheKey = buildCachedTransformedImageKey(params)

    expect(cacheKey).toMatch(
      /^image-cache\/imgproxy\/[\da-f]{2}\/[\da-f]{64}\.webp$/,
    )
    expect(buildCachedTransformedImageKey(params)).toBe(cacheKey)
    expect(buildCachedTransformedImageKey({ ...params, width: 128 })).not.toBe(
      cacheKey,
    )
    expect(
      buildCachedTransformedImageKey({
        src: "https://example.com/logo.jpg",
        width: 64,
        quality: 80,
      }),
    ).toBeNull()
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
