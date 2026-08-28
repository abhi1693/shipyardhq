import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { PartnerSpotlight } from "@/components/templates/public/common/PartnerSpotlight"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const product = {
  slug: "example-product",
  name: "Example Product",
  logo: "",
  tagline: "A useful product",
}

describe("PartnerSpotlight", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
    }
    container?.remove()
    root = null
    container = null
  })

  function renderSpotlight() {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(<PartnerSpotlight product={product} />)
    })
  }

  it("exposes its fixed placement for route-level visibility handling", () => {
    renderSpotlight()

    expect(container?.firstElementChild).toHaveAttribute(
      "data-partner-spotlight",
    )
  })
})
