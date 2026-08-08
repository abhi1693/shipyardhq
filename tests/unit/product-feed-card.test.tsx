import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import ProductFeedCard from "@/components/molecules/ProductFeedCard"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const baseItem: HomepageFeedItem = {
  id: "product-1",
  slug: "example-product",
  name: "Example Product",
  logo: "/brand.png",
  tagline: "A useful product.",
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
  badges: [],
  category: null,
  categorySlug: null,
  categories: [],
  upvoteCount: 0,
  scoreCount: 0,
  isSponsored: false,
  isVoted: false,
  isVerified: false,
  shuffleRank: 0,
}

describe("ProductFeedCard", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) act(() => root?.unmount())
    root = null
    container?.remove()
    container = null
  })

  function renderCard(item: HomepageFeedItem) {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(<ProductFeedCard item={item} />)
    })

    return container.querySelector<HTMLAnchorElement>(
      '[data-testid="homepage-feed-card"]',
    )
  }

  it("keeps regular cards on the product detail page", () => {
    const link = renderCard(baseItem)

    expect(link).toHaveAttribute("href", "/products/example-product")
    expect(link).not.toHaveAttribute("target")
  })

  it("routes sponsored cards through the sponsored redirect endpoint", () => {
    const link = renderCard({
      ...baseItem,
      isSponsored: true,
      variant: "sponsored",
    })

    expect(link).toHaveAttribute("href", "/r/sponsored/example-product")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer sponsored")
  })
})
