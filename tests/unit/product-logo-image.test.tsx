import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import {
  ProductLogoImage,
  resolveProductLogoSrc,
} from "@/components/atoms/product-logo-image"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("ProductLogoImage", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) act(() => root?.unmount())
    container?.remove()
    root = null
    container = null
  })

  it("replaces a broken logo with product initials", () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <ProductLogoImage
          src="https://example.com/missing.png"
          name="Shipyard HQ"
          width={48}
          height={48}
        />,
      )
    })

    const image = container.querySelector("img")
    expect(image).not.toBeNull()
    act(() => image?.dispatchEvent(new Event("error")))

    expect(container.querySelector("img")).toBeNull()
    expect(
      container.querySelector("[data-product-logo-fallback]")?.textContent,
    ).toBe("SH")
  })

  it("normalizes known legacy logo sources before rendering", () => {
    expect(resolveProductLogoSrc("https://shipyardhq.dev/logo.png")).toBe(
      "/brand.png",
    )
    expect(resolveProductLogoSrc("https://logo.clearbit.com/example.com")).toBe(
      null,
    )
  })
})
