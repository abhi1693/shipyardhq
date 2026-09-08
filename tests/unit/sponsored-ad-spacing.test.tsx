import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CarbonAd } from "@/components/molecules/CarbonAd"
import { getProductFeedPage } from "@/actions/public/products/feedPage"
import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { BrowseProductRows } from "@/components/templates/public/browse/BrowseProductRows"
import { BrowseProductRowsClient } from "@/components/templates/public/browse/BrowseProductRowsClient"
import { BrowseRisingStars } from "@/components/templates/public/browse/BrowseRisingStars"
import { TaxonomyProductGridFeed } from "@/components/templates/public/common/TaxonomyProductGridFeed"
import { TaxonomyDetailPage } from "@/components/templates/public/common/TaxonomyDetailPage"
import { HomepageDropsInfiniteList } from "@/components/templates/public/homepage/homepage-client"
import { DetailPromotionSlot } from "@/components/templates/public/products/detail/server-components"
import type { ProductCardBase } from "@/components/molecules/ProductCard"

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))
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

const product = (id: string, sponsored = false) =>
  ({
    id,
    slug: id,
    name: id,
    tagline: "A useful product",
    logo: "",
    sponsored,
    createdAt: "2026-09-08T00:00:00Z",
    scoreCount: 10,
    categories: [],
  }) satisfies ProductCardBase
describe("Single Carbon placement with sponsored products", () => {
  let root: Root, container: HTMLDivElement
  let intersections: Map<Element, IntersectionObserverCallback>
  beforeEach(() => {
    vi.useFakeTimers()
    history.replaceState(null, "", "/browse")
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
    delete document.documentElement.dataset.carbonAdRequested
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

  it("keeps Browse product sections free of additional Carbon ads", async () => {
    const products = [
      product("paid", true),
      ...Array.from({ length: 8 }, (_, i) => product(`organic-${i}`)),
    ]
    await render(
      <>
        <CarbonAd pathname="/browse" />
        <BrowseRisingStars products={products} />
        <BrowseProductRows products={products} />
      </>,
    )
    expect(container.querySelectorAll("[data-carbon-placement]")).toHaveLength(
      1,
    )
    expect(container.querySelectorAll("script")).toHaveLength(1)
    expect(
      container.querySelector('a[href="/r/sponsored/paid"]'),
    ).not.toBeNull()
    expect(
      container.querySelector(
        "[data-product-feed-section] [data-carbon-placement]",
      ),
    ).toBeNull()
  })

  it.each(["browse", "taxonomy"])(
    "keeps one stable sidebar ad when %s pagination adds a sponsor",
    async (kind) => {
      vi.mocked(getProductFeedPage).mockResolvedValue({
        items: [product("paid", true)],
        hasMore: false,
      })
      const initialProducts = [product("organic")]
      await render(
        <>
          <CarbonAd pathname="/browse" />
          {kind === "browse" ? (
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
          )}
        </>,
      )
      const script = container.querySelector("script")
      expect(script).not.toBeNull()
      await loadNextPage()
      expect(
        container.querySelector('a[href="/r/sponsored/paid"]'),
      ).not.toBeNull()
      expect(
        container.querySelectorAll("[data-carbon-placement]"),
      ).toHaveLength(1)
      expect(container.querySelector("script")).toBe(script)
      expect(
        container.querySelector(
          "[data-product-feed-section] [data-carbon-placement]",
        ),
      ).toBeNull()
    },
  )

  it("keeps multiple homepage launch sections free of Carbon placements", async () => {
    history.replaceState(null, "", "/")
    await render(
      <>
        <CarbonAd pathname="/" />
        <HomepageDropsInfiniteList
          initialItems={[
            { ...product("paid"), isSponsored: true, categories: [] },
            ...Array.from({ length: 6 }, (_, i) => ({
              ...product(`today-${i}`),
              categories: [],
            })),
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
        />
      </>,
    )
    expect(
      container.querySelectorAll("[data-product-feed-section]").length,
    ).toBeGreaterThan(1)
    expect(container.querySelectorAll("[data-carbon-placement]")).toHaveLength(
      1,
    )
    expect(container.querySelectorAll("script")).toHaveLength(1)
    expect(
      container.querySelector(
        "[data-product-feed-section] [data-carbon-placement]",
      ),
    ).toBeNull()
    expect(
      container.querySelector('a[href="/r/sponsored/paid"]'),
    ).not.toBeNull()
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
      expect(container.querySelectorAll("script")).toHaveLength(
        sponsored ? 0 : 1,
      )
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
      expect(container.querySelectorAll("script")).toHaveLength(
        sponsored ? 0 : 1,
      )
    },
  )
})
