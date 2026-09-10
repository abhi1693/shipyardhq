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
import { PublicAdLayout } from "@/components/templates/public/common/PublicAdLayout"
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
    "/",
    "/browse",
    "/categories",
    "/categories/developer-tools",
    "/products/current",
    "/leaderboard",
    "/leaderboard/daily/2026/9/10",
    "/leaderboard/weekly/2026/37",
    "/leaderboard/monthly/2026/9",
  ])("keeps one responsive ad outside page content on %s", async (pathname) => {
    history.replaceState(null, "", pathname)
    const layout = (extraContent = false) => (
      <PublicAdLayout
        pathname={pathname}
        beforeAd={<section data-before-ad>Introduction</section>}
      >
        <div data-page-content>
          Products
          {extraContent ? <div>Next page</div> : null}
          <aside>Filters and statistics</aside>
        </div>
      </PublicAdLayout>
    )
    await render(layout())
    const placement = container.querySelector("[data-carbon-placement]")!
    const script = container.querySelector("script")
    expect(script).not.toBeNull()
    expect(placement).not.toHaveClass("hidden")
    expect(
      container.querySelector("[data-page-content] [data-carbon-placement]"),
    ).toBeNull()
    const introduction = container.querySelector("[data-before-ad]")!
    const slot = container.querySelector("[data-public-ad-slot]")!
    const content = container.querySelector("[data-page-content]")!
    expect(introduction.compareDocumentPosition(slot)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(slot.compareDocumentPosition(content)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    await render(layout(true))
    expect(container.querySelectorAll("[data-carbon-placement]")).toHaveLength(
      1,
    )
    expect(container.querySelector("[data-carbon-placement]")).toBe(placement)
    expect(container.querySelector("script")).toBe(script)
  })

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
    "keeps one product-page Carbon ad outside the optional spotlight sidebar (sponsor=%s)",
    async (sponsored) => {
      history.replaceState(null, "", "/products/current")
      vi.mocked(getPartnerSpotlightProducts).mockResolvedValue(
        sponsored ? [product("paid", true)] : [],
      )
      const spotlightContent = await DetailPromotionSlot({
        currentProductSlug: "current",
      })
      await render(
        <PublicAdLayout pathname="/products/current">
          <aside data-product-sidebar>{spotlightContent}</aside>
        </PublicAdLayout>,
      )
      const spotlight = container
        .querySelector('a[href="/r/sponsored/paid"]')
        ?.closest("section")
      expect(Boolean(spotlight)).toBe(sponsored)
      expect(
        container.querySelectorAll("[data-carbon-placement]"),
      ).toHaveLength(1)
      expect(container.querySelectorAll("script")).toHaveLength(1)
      expect(
        container.querySelector(
          "[data-product-sidebar] [data-carbon-placement]",
        ),
      ).toBeNull()
      expect(
        container.querySelector(
          "[data-public-ad-slot] [data-carbon-placement]",
        ),
      ).not.toBeNull()
    },
  )

  it.each([true, false])(
    "keeps one taxonomy Carbon ad outside the optional sponsors sidebar (sponsor=%s)",
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
      const sponsors = container
        .querySelector('aside a[href="/r/sponsored/paid"]')
        ?.closest("section")
      expect(Boolean(sponsors)).toBe(sponsored)
      expect(
        container.querySelectorAll("aside [data-carbon-placement]"),
      ).toHaveLength(1)
      expect(container.querySelectorAll("script")).toHaveLength(1)
      expect(
        container.querySelector(
          "[data-public-ad-slot] [data-carbon-placement]",
        ),
      ).not.toBeNull()
      expect(
        sponsors?.parentElement?.querySelector("[data-carbon-placement]"),
      ).toBeFalsy()
    },
  )
})
