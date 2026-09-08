import { act, StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CarbonAd } from "@/components/molecules/CarbonAd"
import { GoogleAdsenseDisplayUnit } from "@/components/molecules/GoogleAdsenseUnit"

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("Carbon ad lifecycle", () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 400, 280),
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

  function render(
    format: "cover" | "responsive" = "cover",
    pathname = "/browse",
  ) {
    act(() =>
      root.render(
        <StrictMode>
          <CarbonAd pathname={pathname} format={format} />
        </StrictMode>,
      ),
    )
    act(() => vi.runAllTimers())
  }

  it("loads the supplied tag once inside its reserved container, including Strict Mode", () => {
    render()
    const slot = container.querySelector("[data-carbon-placement]")
    const script = slot?.querySelector("script")
    expect(slot).toHaveClass("min-h-[280px]")
    expect(script).toHaveAttribute("id", "_carbonads_js")
    expect(script).toHaveAttribute(
      "src",
      "https://cdn.carbonads.com/carbon.js?serve=CWBI4KJN&placement=shipyardhqdev&format=cover",
    )
    expect(script?.async).toBe(true)
    render()
    expect(document.querySelectorAll("#_carbonads_js")).toHaveLength(1)
    expect(container.querySelector("script")).toBe(script)
    expect(document.getElementById("google-adsense-script")).toBeNull()
  })

  it("uses the compact tag and reserved height for sidebars", () => {
    render("responsive")
    expect(container.querySelector("[data-carbon-placement]")).toHaveClass(
      "min-h-[155px]",
    )
    expect(container.querySelector("script")?.src).toContain(
      "format=responsive",
    )
  })

  it("does not refresh ads when only browse filters change", () => {
    render()
    const script = container.querySelector("script")
    history.replaceState(null, "", "/browse?q=tools")
    render()
    expect(container.querySelector("script")).toBe(script)
  })

  it("does not load or claim the document when the mobile slot has no space", () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(),
    )
    render()
    expect(container.querySelector("script")).toBeNull()
    expect(document.documentElement.dataset.adDocumentNetwork).toBeUndefined()
  })

  it("loads once when resizing reveals the slot", () => {
    let resize = () => {}
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
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(),
    )
    render()
    expect(container.querySelector("script")).toBeNull()
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 0, 400, 280),
    )
    act(() => resize())
    const script = container.querySelector("script")
    expect(script).not.toBeNull()
    act(() => resize())
    expect(container.querySelector("script")).toBe(script)
    expect(document.querySelectorAll("#_carbonads_js")).toHaveLength(1)
  })

  it("never loads on guides even when a stale discovery slot mounts", () => {
    history.replaceState(null, "", "/guides/product-launch-checklist")
    render()
    expect(container.querySelector("script")).toBeNull()
    render("cover", "/guides/product-launch-checklist")
    expect(container.innerHTML).toBe("")
  })

  it("prevents Carbon from starting in a document previously used by AdSense", () => {
    document.documentElement.dataset.adDocumentNetwork = "adsense"
    document.documentElement.dataset.adDocumentPath = "/browse"
    render()
    expect(container.querySelector("script")).toBeNull()
  })

  it("prevents AdSense from starting in a document previously used by Carbon", () => {
    history.replaceState(null, "", "/guides/product-launch-checklist")
    document.documentElement.dataset.adDocumentNetwork = "carbon"
    document.documentElement.dataset.adDocumentPath = location.pathname
    act(() => root.render(<GoogleAdsenseDisplayUnit />))
    expect(document.getElementById("google-adsense-script")).toBeNull()
    expect(window.adsbygoogle).toBeUndefined()
  })

  it("removes the reserved slot when the script is blocked", () => {
    render()
    act(() =>
      container.querySelector("script")?.dispatchEvent(new Event("error")),
    )
    expect(container.innerHTML).toBe("")
  })

  it("cancels an unmounted slot before loading the tag", () => {
    act(() => root.render(<CarbonAd pathname="/browse" />))
    act(() => root.render(null))
    act(() => vi.runAllTimers())
    expect(document.getElementById("_carbonads_js")).toBeNull()
    expect(document.documentElement.dataset.adDocumentNetwork).toBeUndefined()
  })

  it("removes vendor-inserted content on unmount", () => {
    render()
    const slot = container.querySelector("[data-carbon-placement]")!
    slot.appendChild(document.createElement("iframe"))
    act(() => root.render(null))
    expect(slot.childNodes).toHaveLength(0)
    expect(document.getElementById("_carbonads_js")).toBeNull()
  })
})
