import { act, StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CarbonFeedAd } from "@/components/molecules/CarbonFeedAd"
import { fetchCarbonAd } from "@/lib/ads/creative"
import { TaxonomyProductSections } from "@/components/templates/public/common/TaxonomyProductRows"
import type { HomepageFeedItem } from "@/actions/public/homepage/feed"

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))
vi.mock("@/lib/ads/creative", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ads/creative")>()),
  fetchCarbonAd: vi.fn(),
}))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const ad = {
  visual: {
    kind: "image-text" as const,
    smallImage: "https://cdn4.buysellads.net/test.png",
  },
  link: "https://example.com/click",
  description: "A sponsor for builders",
  company: "Test sponsor",
  callToAction: "Explore",
  pixels: [],
}

const products = (count: number): HomepageFeedItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    slug: `product-${index}`,
    name: `Product ${index}`,
    logo: "",
    tagline: "A product",
    createdAt: "2026-09-08T00:00:00Z",
    updatedAt: "2026-09-08T00:00:00Z",
    badges: [],
    category: null,
    categorySlug: null,
    categories: [],
    upvoteCount: 0,
    scoreCount: 0,
    updatesCount: 0,
    isSponsored: false,
    isVoted: false,
    isVerified: false,
    variant: "default",
    interest: null,
    shuffleRank: 0,
  }))

describe("Section ad lifecycle", () => {
  let container: HTMLDivElement
  let root: Root
  let resized: () => void
  let visibility: (entries: Partial<IntersectionObserverEntry>[]) => void

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(fetchCarbonAd).mockReset().mockResolvedValue(ad)
    history.replaceState(null, "", "/browse")
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 700, 155),
    )
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof visibility) {
          visibility = callback
        }
        observe() {}
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
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function render(sections = ["latest"], count = 3) {
    await act(async () => {
      root.render(
        <StrictMode>
          {sections.map((section) => (
            <section key={section}>
              <span>{count} products</span>
              <CarbonFeedAd section={section} />
            </section>
          ))}
        </StrictMode>,
      )
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it("makes one independent request per section, including Strict Mode", async () => {
    await render(["latest", "previous"])
    expect(fetchCarbonAd).toHaveBeenCalledTimes(2)
    expect(
      container.querySelectorAll("[data-carbon-feed-creative]"),
    ).toHaveLength(2)
    expect(container.querySelectorAll("script")).toHaveLength(0)
    await render(["latest", "previous"], 20)
    expect(fetchCarbonAd).toHaveBeenCalledTimes(2)
    await render(["latest", "previous", "earlier"], 25)
    expect(fetchCarbonAd).toHaveBeenCalledTimes(3)
  })

  it("keeps a taxonomy section's ad mounted when pagination adds products", async () => {
    const section = (count: number) => ({
      key: "latest",
      title: "Latest launches",
      dateLabel: "Sep 8",
      products: products(count),
    })
    await act(async () =>
      root.render(<TaxonomyProductSections sections={[section(1)]} />),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const creative = container.querySelector("[data-carbon-feed-creative]")
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
    await act(async () =>
      root.render(<TaxonomyProductSections sections={[section(5)]} />),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
    expect(container.querySelector("[data-carbon-feed-creative]")).toBe(
      creative,
    )
    await act(async () =>
      root.render(
        <TaxonomyProductSections
          sections={[{ ...section(5), products: products(5).reverse() }]}
        />,
      ),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
    expect(container.querySelector("[data-carbon-feed-creative]")).toBe(
      creative,
    )
  })

  it("removes a crowded ad and repositions the next section ad away from a new sponsor", async () => {
    const latest = {
      key: "latest",
      title: "Latest",
      dateLabel: "Sep 8",
      products: products(2),
    }
    const earlier = {
      key: "earlier",
      title: "Earlier",
      dateLabel: "Sep 7",
      products: products(3),
    }
    await act(async () =>
      root.render(<TaxonomyProductSections sections={[latest, earlier]} />),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchCarbonAd).toHaveBeenCalledTimes(2)
    await act(async () =>
      root.render(
        <TaxonomyProductSections
          sections={[
            {
              ...latest,
              products: [
                ...latest.products,
                { ...products(3)[2], isSponsored: true },
              ],
            },
            earlier,
          ]}
        />,
      ),
    )
    expect(
      container.querySelector('[data-carbon-section="taxonomy-latest"]'),
    ).toBeNull()
    expect(
      container.querySelector('[data-carbon-section="taxonomy-earlier"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('a[href="/r/sponsored/product-2"]'),
    ).not.toBeNull()
    expect(fetchCarbonAd).toHaveBeenCalledTimes(2)
  })

  it("does not request ads on mobile until a section has space", async () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(),
    )
    await render()
    expect(fetchCarbonAd).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.adDocumentNetwork).toBeUndefined()
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 0, 700, 155),
    )
    await act(async () => resized())
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it("never loads on tools, guides, or in an AdSense document", async () => {
    history.replaceState(null, "", "/tools/seo-audit")
    await render()
    history.replaceState(null, "", "/guides/product-launch-checklist")
    await render()
    history.replaceState(null, "", "/browse")
    document.documentElement.dataset.adDocumentNetwork = "adsense"
    document.documentElement.dataset.adDocumentPath = "/browse"
    await render()
    expect(fetchCarbonAd).not.toHaveBeenCalled()
  })

  it("collapses an unfilled section without affecting another section", async () => {
    vi.mocked(fetchCarbonAd)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ad)
    await render(["latest", "previous"])
    expect(container.querySelector('[data-carbon-section="latest"]')).toBeNull()
    expect(
      container.querySelector('[data-carbon-section="previous"]'),
    ).not.toBeNull()
  })

  it("aborts the pending request when its section disappears", async () => {
    vi.mocked(fetchCarbonAd).mockReturnValue(new Promise(() => {}))
    await render()
    const signal = vi.mocked(fetchCarbonAd).mock.calls[0][0]
    act(() => root.render(null))
    expect(signal.aborted).toBe(true)
  })

  it("requires a continuous second of visibility before recording one view", async () => {
    vi.mocked(fetchCarbonAd).mockResolvedValue({
      ...ad,
      viewUrl: "https://srv.buysellads.com/ads/viewable/test",
    })
    const fetcher = vi.fn().mockResolvedValue({})
    vi.stubGlobal("fetch", fetcher)
    await render()
    await act(async () =>
      container.querySelector("img")!.dispatchEvent(new Event("load")),
    )
    act(() => visibility([{ isIntersecting: true, intersectionRatio: 0.7 }]))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    act(() => visibility([{ isIntersecting: false, intersectionRatio: 0 }]))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(fetcher).not.toHaveBeenCalled()
    act(() => visibility([{ isIntersecting: true, intersectionRatio: 0.7 }]))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    act(() => visibility([{ isIntersecting: true, intersectionRatio: 1 }]))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
