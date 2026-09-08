import { act, StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CarbonAd } from "@/components/molecules/CarbonAd"
import { GoogleAdsenseDisplayUnit } from "@/components/molecules/GoogleAdsenseUnit"
import { CARBON_ATTRIBUTION_URL } from "@/lib/ads/config"
import { fetchCarbonAd, parseCarbonCreative } from "@/lib/ads/creative"

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))
vi.mock("@/lib/ads/creative", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ads/creative")>()),
  fetchCarbonAd: vi.fn(),
}))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const campaign = {
  statlink: "https://example.com/campaign-click",
  description: "Tools for your next launch",
  smallImage: "https://cdn4.buysellads.net/130x100.png",
}

describe("Carbon sidebar templates", () => {
  let root: Root
  let container: HTMLDivElement
  let resize: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(fetchCarbonAd)
      .mockReset()
      .mockResolvedValue(parseCarbonCreative({ ads: [campaign] }))
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 320, 155),
    )
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    history.replaceState(null, "", "/browse")
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.getElementById("google-adsense-script")?.remove()
    delete document.documentElement.dataset.adDocumentNetwork
    delete document.documentElement.dataset.adDocumentPath
    delete document.documentElement.dataset.adDocumentReloading
    delete window.adsbygoogle
    history.replaceState(null, "", "/")
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function render(pathname = "/browse") {
    await act(async () =>
      root.render(
        <StrictMode>
          <CarbonAd pathname={pathname} />
        </StrictMode>,
      ),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it("requests a single sidebar creative in Strict Mode without a vendor template runtime", async () => {
    await render()
    expect(fetchCarbonAd).toHaveBeenCalledExactlyOnceWith(
      expect.any(AbortSignal),
      "sidebar",
    )
    expect(
      container.querySelector('[data-carbon-template="sidebar"]'),
    ).toHaveClass("min-h-[155px]")
    expect(
      container.querySelectorAll('[data-carbon-creative="image-text"]'),
    ).toHaveLength(1)
    expect(container.querySelector("script")).toBeNull()
    await render()
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      "image-text",
      { smallImage: campaign.smallImage },
      campaign.smallImage,
      "130",
      "100",
    ],
    [
      "logo-text",
      { logo: "https://cdn4.buysellads.net/logo.png" },
      "https://cdn4.buysellads.net/logo.png",
      "125",
      "50",
    ],
    [
      "native-icon",
      { image: "https://cdn4.buysellads.net/icon.png" },
      "https://cdn4.buysellads.net/icon.png",
      "40",
      "40",
    ],
  ])(
    "renders the %s asset in its correct template without missing placeholders",
    async (kind, assets, src, width, height) => {
      vi.mocked(fetchCarbonAd).mockResolvedValue(
        parseCarbonCreative({
          ads: [{ ...campaign, smallImage: undefined, ...assets }],
        }),
      )
      await render()
      expect(container.querySelector("[data-carbon-creative]")).toHaveAttribute(
        "data-carbon-creative",
        kind,
      )
      const image = container.querySelector("img")
      expect(image).toHaveAttribute("src", src)
      expect(image).toHaveAttribute("width", width)
      expect(image).toHaveAttribute("height", height)
      expect(
        container.querySelector(".shipyard-carbon-footer a"),
      ).toHaveAttribute("href", CARBON_ATTRIBUTION_URL)
      expect(container.innerHTML).not.toContain("##")
    },
  )

  it("uses the rich template for artwork, brand logo, tagline and complete copy", async () => {
    vi.mocked(fetchCarbonAd).mockResolvedValue(
      parseCarbonCreative({
        ads: [
          {
            ...campaign,
            largeImage: "https://cdn4.buysellads.net/artwork.png",
            logo: "https://cdn4.buysellads.net/logo.png",
            company: "Sponsor",
            companyTagline: "Build something",
            callToAction: "Try it",
            backgroundColor: "#000000",
          },
        ],
      }),
    )
    await render()
    expect(
      container.querySelector('[data-carbon-creative="rich"]'),
    ).not.toBeNull()
    expect(container.querySelectorAll("img")).toHaveLength(2)
    expect(container.querySelector(".shipyard-carbon-logo")).toHaveAttribute(
      "src",
      "https://cdn4.buysellads.net/logo.png",
    )
    expect(
      container.querySelector(".shipyard-carbon-tagline"),
    ).toHaveTextContent("Build something")
    expect(
      container.querySelector(".shipyard-carbon-description"),
    ).toHaveTextContent(campaign.description)
    expect(container.querySelector(".shipyard-carbon-cta")).toHaveTextContent(
      "Try it",
    )
  })

  it("renders an optional-image native campaign as a text template", async () => {
    vi.mocked(fetchCarbonAd).mockResolvedValue(
      parseCarbonCreative({
        ads: [{ ...campaign, smallImage: undefined, company: "Sponsor" }],
      }),
    )
    await render()
    expect(
      container.querySelector('[data-carbon-creative="text"]'),
    ).not.toBeNull()
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("Sponsor")
  })

  it("does not refresh when browse filters change", async () => {
    await render()
    history.replaceState(null, "", "/browse?q=tools")
    await render()
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it("makes no request on mobile and loads once when the slot becomes visible", async () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(),
    )
    await render()
    expect(fetchCarbonAd).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.adDocumentNetwork).toBeUndefined()
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 0, 320, 155),
    )
    await act(async () => resize())
    await act(async () => resize())
    expect(fetchCarbonAd).toHaveBeenCalledTimes(1)
  })

  it("rejects guides, tools, stale discovery paths, and an AdSense document", async () => {
    for (const path of [
      "/guides/product-launch-checklist",
      "/tools/seo-audit",
    ]) {
      history.replaceState(null, "", path)
      await render(path)
      expect(container.innerHTML).toBe("")
    }
    history.replaceState(null, "", "/guides/product-launch-checklist")
    await render()
    expect(fetchCarbonAd).not.toHaveBeenCalled()
    act(() => root.render(null))
    history.replaceState(null, "", "/browse")
    document.documentElement.dataset.adDocumentNetwork = "adsense"
    document.documentElement.dataset.adDocumentPath = "/browse"
    await render()
    expect(fetchCarbonAd).not.toHaveBeenCalled()
  })

  it("prevents AdSense from starting in a Carbon document", async () => {
    await render()
    history.replaceState(null, "", "/guides/product-launch-checklist")
    act(() => root.render(<GoogleAdsenseDisplayUnit />))
    expect(document.getElementById("google-adsense-script")).toBeNull()
    expect(window.adsbygoogle).toBeUndefined()
  })

  it.each(["empty", "blocked"])("collapses a %s response", async (result) => {
    if (result === "empty") vi.mocked(fetchCarbonAd).mockResolvedValue(null)
    else vi.mocked(fetchCarbonAd).mockRejectedValue(new Error("Blocked"))
    await render()
    expect(container.innerHTML).toBe("")
  })

  it("cancels an unmounted slot before requesting an ad", async () => {
    act(() => root.render(<CarbonAd pathname="/browse" />))
    act(() => root.render(null))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchCarbonAd).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.adDocumentNetwork).toBeUndefined()
  })

  it("aborts a pending request when unmounted", async () => {
    vi.mocked(fetchCarbonAd).mockReturnValue(new Promise(() => {}))
    await render()
    const signal = vi.mocked(fetchCarbonAd).mock.calls[0][0]
    act(() => root.render(null))
    expect(signal.aborted).toBe(true)
    expect(container.innerHTML).toBe("")
  })
})
