import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("ProductCategoryPills", () => {
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

  it("renders all three category links without hiding them on mobile", () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <ProductCategoryPills
          categories={[
            { name: "Developer Tools", slug: "developer-tools" },
            { name: "Analytics", slug: "analytics" },
            {
              name: "Artificial Intelligence",
              slug: "artificial-intelligence",
            },
          ]}
        />,
      )
    })

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"))

    expect(links).toHaveLength(3)
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      "Developer Tools",
      "Analytics",
      "Artificial Intelligence",
    ])
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/categories/developer-tools",
      "/categories/analytics",
      "/categories/artificial-intelligence",
    ])
    expect(container.querySelector(".hidden")).toBeNull()
  })
})
