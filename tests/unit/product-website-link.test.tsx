import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProductWebsiteLink } from "@/components/molecules/ProductWebsiteLink"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("ProductWebsiteLink", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) act(() => root?.unmount())
    root = null
    container?.remove()
    container = null
    vi.restoreAllMocks()
  })

  it("tracks a direct website click without replacing the direct href", () => {
    const sendBeacon = vi.fn(() => true)
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <ProductWebsiteLink
          href="https://example.com/product"
          productSlug="example-product"
          trackWithBeacon
          rel="noopener sponsored"
        >
          Visit website
        </ProductWebsiteLink>,
      )
    })

    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "https://example.com/product")

    act(() => {
      link?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(sendBeacon).toHaveBeenCalledWith(
      "/api/products/example-product/website-click",
    )
  })

  it("lets redirect-based links rely on server-side measurement", () => {
    const sendBeacon = vi.fn(() => true)
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <ProductWebsiteLink
          href="/r/example-product"
          productSlug="example-product"
          trackWithBeacon={false}
          rel="noopener noreferrer"
        >
          Visit website
        </ProductWebsiteLink>,
      )
    })

    act(() => {
      container
        ?.querySelector("a")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(sendBeacon).not.toHaveBeenCalled()
  })
})
