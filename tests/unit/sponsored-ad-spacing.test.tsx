import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { fetchCarbonAd } from "@/lib/ads/creative"
import { getProductFeedPage } from "@/actions/public/products/feedPage"
import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { BrowseProductRows } from "@/components/templates/public/browse/BrowseProductRows"
import { BrowseProductRowsClient } from "@/components/templates/public/browse/BrowseProductRowsClient"
import { BrowseRisingStars } from "@/components/templates/public/browse/BrowseRisingStars"
import { TaxonomyProductGridFeed } from "@/components/templates/public/common/TaxonomyProductGridFeed"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { HomepageDropsInfiniteList } from "@/components/templates/public/homepage/homepage-client"
import { DetailPromotionSlot } from "@/components/templates/public/products/detail/server-components"
import { feedAdIndex } from "@/lib/ads/feed"
import type { ProductCardBase } from "@/components/molecules/ProductCard"

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))
vi.mock("@/lib/ads/creative", () => ({ fetchCarbonAd: vi.fn() }))
vi.mock("@/actions/public/products/feedPage", () => ({
  getProductFeedPage: vi.fn(),
}))
vi.mock("@/actions/public/products/featured", () => ({
  getPartnerSpotlightProducts: vi.fn(),
}))
vi.mock("@/actions/public/products/actions", () => ({
  getPublicProductsByCategory: vi.fn(),
  getPublicProductsByUseCase: vi.fn(),
}))
vi.mock("@/lib/server/analytics/productInterest", () => ({
  getProductInterestSignalsMap: vi.fn(),
}))
vi.mock("@/components/molecules/ProductUpvoteBadge", () => ({
  default: () => null,
}))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const product = (id: string, sponsored = false): ProductCardBase => ({
  id,
  slug: id,
  name: id,
  tagline: "A useful product",
  logo: "",
  sponsored,
  createdAt: "2026-09-08T00:00:00Z",
  scoreCount: 10,
  categories: [],
})
const ad = {
  visual: {
    kind: "image-text" as const,
    smallImage: "https://cdn4.buysellads.net/test.png",
  },
  link: "https://example.com/ad",
  description: "An advertisement",
  company: "",
  callToAction: "",
  pixels: [],
}

describe("Sponsored products and Carbon spacing", () => {
  let root: Root, container: HTMLDivElement
  let intersections: Map<Element, IntersectionObserverCallback>
  beforeEach(() => {
    vi.useFakeTimers()
    history.replaceState(null, "", "/browse")
    vi.mocked(fetchCarbonAd).mockReset().mockResolvedValue(ad)
    vi.mocked(getProductFeedPage).mockReset()
    vi.mocked(getPartnerSpotlightProducts).mockReset()
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 700, 155),
    )
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    )
    intersections = new Map()
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          intersections.set(target, this.callback)
        }
        disconnect() {}
      },
    )
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    delete document.documentElement.dataset.adDocumentNetwork
    delete document.documentElement.dataset.adDocumentPath
    delete document.documentElement.dataset.adDocumentReloading
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  async function render(node: ReactNode) {
    await act(async () => root.render(node))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }
  async function loadNextPage() {
    const target = container.querySelector(
      '[data-testid="browse-infinite-scroll-trigger"]',
    )!
    expect(target).not.toBeNull()
    await act(async () =>
      intersections.get(target)?.(
        [{ target, isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it.each([
    { sponsored: true },
    { isSponsored: true },
    { variant: "sponsored" },
    { variant: "promoted" },
  ])("requires three organic products around paid placement %j", (paid) => {
    expect(feedAdIndex([{}, paid, {}])).toBe(-1)
    expect(feedAdIndex([paid, {}, {}, {}])).toBe(3)
    expect(feedAdIndex([paid, {}, {}, {}, {}, {}, {}, paid])).toBe(3)
    expect(feedAdIndex([])).toBe(-1)
    expect(feedAdIndex([{}])).toBe(0)
  })

  it.each(["fresh", "rising"])(
    "keeps sponsored products and makes no Carbon request in Browse %s",
    async (section) => {
      const items = [product("organic"), product("paid", true)]
      await render(
        section === "fresh" ? (
          <BrowseProductRows products={items} />
        ) : (
          <BrowseRisingStars products={items} />
        ),
      )
      expect(
        container.querySelector('a[href="/r/sponsored/paid"]'),
      ).not.toBeNull()
      expect(container.querySelector("[data-carbon-placement]")).toBeNull()
      expect(fetchCarbonAd).not.toHaveBeenCalled()
    },
  )

  it("keeps Carbon in a separate unsponsored Browse section", async () => {
    await render(
      <>
        <BrowseRisingStars products={[product("paid", true)]} />
        <BrowseProductRows products={[product("organic")]} />
      </>,
    )
    expect(
      container.querySelector('[data-carbon-section="browse-rising-stars"]'),
    ).toBeNull()
    expect(
      container.querySelector('[data-carbon-section="browse-fresh-finds"]'),
    ).not.toBeNull()
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it.each(["browse", "taxonomy"])(
    "removes an existing ad when pagination adds a sponsor to its %s section",
    async (kind) => {
      vi.mocked(getProductFeedPage).mockResolvedValue({
        items: [product("paid", true)],
        hasMore: false,
      })
      const initialProducts = [product("organic")]
      await render(
        kind === "browse" ? (
          <BrowseProductRowsClient
            initialProducts={initialProducts}
            initialHasMore
            initialPage={2}
            pageSize={1}
            searchParams={{}}
          />
        ) : (
          <TaxonomyProductGridFeed
            products={initialProducts}
            hasMore
            initialPage={2}
            pageSize={1}
            searchParams={{}}
            emptyTitle="Empty"
          />
        ),
      )
      expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
      expect(container.querySelector("[data-carbon-placement]")).not.toBeNull()
      await loadNextPage()
      expect(
        container.querySelector('a[href="/r/sponsored/paid"]'),
      ).not.toBeNull()
      expect(container.querySelector("[data-carbon-placement]")).toBeNull()
      expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
    },
  )

  it.each(["browse", "taxonomy"])(
    "moves the same ad past three regular products when a sponsor paginates into %s",
    async (kind) => {
      vi.mocked(getProductFeedPage).mockResolvedValue({
        items: [
          product("paid", true),
          product("one"),
          product("two"),
          product("three"),
        ],
        hasMore: false,
      })
      const initialProducts = [product("organic")]
      await render(
        kind === "browse" ? (
          <BrowseProductRowsClient
            initialProducts={initialProducts}
            initialHasMore
            initialPage={2}
            pageSize={4}
            searchParams={{}}
          />
        ) : (
          <TaxonomyProductGridFeed
            products={initialProducts}
            hasMore
            initialPage={2}
            pageSize={4}
            searchParams={{}}
            emptyTitle="Empty"
          />
        ),
      )
      const creative = container.querySelector("[data-carbon-creative]")
      await loadNextPage()
      const slot = container.querySelector("[data-carbon-placement]")!
      expect(slot).not.toBeNull()
      expect(container.querySelector("[data-carbon-creative]")).toBe(creative)
      expect(Array.from(slot.parentElement!.children).indexOf(slot)).toBe(5)
      expect(
        container.querySelector('a[href="/r/sponsored/paid"]'),
      ).not.toBeNull()
      expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
    },
  )

  it("shows both placements in Fresh Finds with a gap on both sides", async () => {
    await render(
      <BrowseProductRows
        products={[
          product("paid-first", true),
          ...Array.from({ length: 6 }, (_, i) => product(`regular-${i}`)),
          product("paid-last", true),
        ]}
      />,
    )
    const slot = container.querySelector(
      '[data-carbon-section="browse-fresh-finds"]',
    )!
    expect(slot).not.toBeNull()
    const siblings = Array.from(slot.parentElement!.children)
    expect(siblings.indexOf(slot)).toBe(4)
    expect(siblings).toHaveLength(9)
    expect(
      container.querySelector('a[href="/r/sponsored/paid-first"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('a[href="/r/sponsored/paid-last"]'),
    ).not.toBeNull()
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it("does not place an ad against a sponsor across the Rising Stars/Fresh Finds heading", async () => {
    const items = [
      { ...product("paid", true), scoreCount: 1 },
      product("one"),
      product("two"),
      product("three"),
    ]
    await render(<BrowseRisingStars products={items} />)
    expect(container.querySelector("[data-carbon-placement]")).toBeNull()
    await render(
      <BrowseProductRows
        products={[product("one"), product("two"), product("three")]}
        precedingProducts={[product("paid", true)]}
      />,
    )
    const slot = container.querySelector("[data-carbon-placement]")!
    expect(Array.from(slot.parentElement!.children).indexOf(slot)).toBe(3)
  })

  it("retains one taxonomy ad and the same DOM node when only organic products paginate", async () => {
    vi.mocked(getProductFeedPage).mockResolvedValue({
      items: [product("organic-2")],
      hasMore: false,
    })
    await render(
      <TaxonomyProductGridFeed
        products={[product("organic")]}
        hasMore
        initialPage={2}
        pageSize={1}
        searchParams={{}}
        emptyTitle="Empty"
      />,
    )
    const creative = container.querySelector("[data-carbon-creative]")
    await loadNextPage()
    expect(container.querySelectorAll("[data-carbon-placement]")).toHaveLength(
      1,
    )
    expect(container.querySelector("[data-carbon-creative]")).toBe(creative)
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it("shows both placements in one homepage section with three products between them", async () => {
    history.replaceState(null, "", "/")
    await render(
      <HomepageDropsInfiniteList
        initialItems={[
          { ...product("paid"), isSponsored: true, categories: [] },
          { ...product("today-1"), categories: [] },
          { ...product("today-2"), categories: [] },
          { ...product("today-3"), categories: [] },
          {
            ...product("yesterday"),
            createdAt: "2026-09-07T00:00:00Z",
            categories: [],
          },
        ]}
        initialHasMore={false}
        initialNextPage={null}
        pageSize={12}
        launchPeriod={null}
        referenceDateIso="2026-09-08T12:00:00Z"
      />,
    )
    expect(
      container.querySelector(
        '[data-product-feed-section="today"] a[href="/r/sponsored/paid"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-carbon-section="home-today"]'),
    ).not.toBeNull()
    const slot = container.querySelector('[data-carbon-section="home-today"]')!
    expect(Array.from(slot.parentElement!.children).indexOf(slot)).toBe(4)
    expect(
      container.querySelector('[data-carbon-section="home-yesterday"]'),
    ).not.toBeNull()
    expect(fetchCarbonAd).toHaveBeenCalledTimes(2)
  })

  it.each([true, false])(
    "shows a product spotlight or Carbon, exclusively (sponsor=%s)",
    async (sponsored) => {
      history.replaceState(null, "", "/products/current")
      vi.mocked(getPartnerSpotlightProducts).mockResolvedValue(
        sponsored ? [product("paid", true)] : [],
      )
      await render(await DetailPromotionSlot({ currentProductSlug: "current" }))
      expect(
        Boolean(container.querySelector('a[href="/r/sponsored/paid"]')),
      ).toBe(sponsored)
      expect(Boolean(container.querySelector("[data-carbon-placement]"))).toBe(
        !sponsored,
      )
      expect(fetchCarbonAd).toHaveBeenCalledTimes(sponsored ? 0 : 1)
    },
  )

  it.each([true, false])(
    "shows taxonomy sponsors or a sidebar ad, exclusively (sponsor=%s)",
    async (sponsored) => {
      await render(
        <TaxonomyDetailPage
          title="Directory"
          description="Tools"
          icon={null}
          primaryCta={{ href: "/browse", label: "Browse" }}
          secondaryCta={{ href: "/browse", label: "More" }}
          tertiaryCta={{ href: "/browse", label: "All" }}
          stats={[]}
          feed={<span>Products</span>}
          feedTestId="feed"
          carbonPathname="/browse"
          sponsorProducts={sponsored ? [product("paid", true)] : []}
        />,
      )
      expect(
        Boolean(container.querySelector('aside a[href="/r/sponsored/paid"]')),
      ).toBe(sponsored)
      expect(
        Boolean(container.querySelector("aside [data-carbon-placement]")),
      ).toBe(!sponsored)
      expect(fetchCarbonAd).toHaveBeenCalledTimes(sponsored ? 0 : 1)
    },
  )
})
