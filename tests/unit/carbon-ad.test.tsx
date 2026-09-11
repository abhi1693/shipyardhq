import { act, StrictMode, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CarbonAd } from "@/components/molecules/CarbonAd"
import { CARBON_SCRIPT_URL } from "@/lib/ads/config"

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }))
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("Standard Carbon embed", () => {
  let root: Root
  let container: HTMLDivElement
  let resize: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 155),
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
    delete document.documentElement.dataset.adDocumentPath
    delete document.documentElement.dataset.adDocumentReloading
    delete document.documentElement.dataset.carbonAdRequested
    history.replaceState(null, "", "/")
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function render(node: ReactNode = <CarbonAd pathname="/browse" />) {
    await act(async () => root.render(<StrictMode>{node}</StrictMode>))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  it.each(["/member/overview", "/member/products/shipyard-hq"])(
    "loads one responsive ad on %s",
    async (pathname) => {
      history.replaceState(null, "", pathname)
      await render(<CarbonAd pathname={pathname} variant="banner" />)
      expect(container.querySelectorAll("script")).toHaveLength(1)
      expect(container.firstElementChild).not.toHaveClass("hidden")
    },
  )

  it("does not load an overview ad on another member page", async () => {
    history.replaceState(null, "", "/member/products")
    await render(<CarbonAd pathname="/member/overview" variant="banner" />)
    expect(container.querySelector("script")).toBeNull()
    expect(document.documentElement.dataset.carbonAdRequested).toBeUndefined()
  })

  it.each([320, 768, 1024, 1366])(
    "loads the default placement at %ipx without refreshing on resize",
    async (width) => {
      vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
        new DOMRect(0, 0, width, 155),
      )
      await render()
      const script = container.querySelector("script")
      expect(script).not.toBeNull()
      expect(container.firstElementChild).not.toHaveClass("hidden")
      act(() => resize())
      expect(container.querySelectorAll("script")).toHaveLength(1)
      expect(container.querySelector("script")).toBe(script)
    },
  )

  it("loads the hosted standard embed once in Strict Mode", async () => {
    const appended = vi.spyOn(HTMLElement.prototype, "appendChild")
    await render()
    const script = container.querySelector("script")!
    expect(script.id).toBe("_carbonads_js")
    expect(script.src).toBe(CARBON_SCRIPT_URL)
    expect(script.async).toBe(true)
    expect(container.querySelector("style")).toBeNull()
    await render()
    expect(container.querySelector("script")).toBe(script)
    expect(
      appended.mock.calls.filter(([node]) => node === script),
    ).toHaveLength(1)
  })

  it("allows only one ad even when multiple placements mount together", async () => {
    await render(
      <>
        <CarbonAd pathname="/browse" />
        <CarbonAd pathname="/browse" />
      </>,
    )
    expect(container.querySelectorAll("script")).toHaveLength(1)
    expect(container.querySelectorAll("[data-carbon-placement]")).toHaveLength(
      1,
    )
  })

  it("does not request another ad after unmount and remount", async () => {
    await render()
    await render(null)
    await render()
    expect(container.innerHTML).toBe("")
    expect(document.documentElement.dataset.carbonAdRequested).toBe("true")
  })

  it("does not refresh on same-path filters or viewport changes", async () => {
    await render()
    const script = container.querySelector("script")
    history.replaceState(null, "", "/browse?q=tools")
    await render()
    act(() => resize())
    expect(container.querySelector("script")).toBe(script)
  })

  it("makes no request in a hidden container and loads once when visible", async () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(),
    )
    await render()
    expect(container.querySelector("script")).toBeNull()
    expect(document.documentElement.dataset.adDocumentPath).toBeUndefined()
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue(
      new DOMRect(0, 0, 360, 155),
    )
    act(() => resize())
    act(() => resize())
    expect(container.querySelectorAll("script")).toHaveLength(1)
  })

  it("rejects guides, tools, and stale discovery paths", async () => {
    for (const path of [
      "/guides/product-launch-checklist",
      "/tools/seo-audit",
    ]) {
      history.replaceState(null, "", path)
      await render(<CarbonAd pathname={path} />)
      expect(container.innerHTML).toBe("")
    }
    history.replaceState(null, "", "/guides/product-launch-checklist")
    await render()
    expect(container.querySelector("script")).toBeNull()
    expect(document.documentElement.dataset.carbonAdRequested).toBeUndefined()
  })

  it("preserves reserved space on blocked loads and never retries", async () => {
    await render()
    act(() =>
      container.querySelector("script")!.dispatchEvent(new Event("error")),
    )
    expect(container.firstElementChild).toHaveStyle({ minHeight: "155px" })
    const script = container.querySelector("script")
    await render()
    expect(container.querySelector("script")).toBe(script)
    await render(null)
    await render()
    expect(container.innerHTML).toBe("")
  })

  it("uses the production responsive embed for the mobile-enabled homepage slot", async () => {
    history.replaceState(null, "", "/")
    await render(<CarbonAd pathname="/" variant="banner" />)
    const script = container.querySelector("script")!
    expect(new URL(script.src).searchParams.get("serve")).toBe("CWBI4KJN")
    expect(new URL(script.src).searchParams.get("placement")).toBe(
      "shipyardhqdev",
    )
    expect(new URL(script.src).searchParams.get("format")).toBe("responsive")
    expect(container.firstElementChild).not.toHaveClass("hidden")
    await render(<CarbonAd pathname="/" variant="banner" />)
    expect(container.querySelector("script")).toBe(script)
  })

  it("shares the one-ad document limit between homepage and sidebar placements", async () => {
    history.replaceState(null, "", "/")
    await render(
      <>
        <CarbonAd pathname="/" variant="banner" />
        <CarbonAd pathname="/" />
      </>,
    )
    expect(container.querySelectorAll("[data-carbon-placement]")).toHaveLength(
      1,
    )
    expect(container.querySelectorAll("script")).toHaveLength(1)
  })

  it("cancels an unmounted slot before loading the script", async () => {
    act(() => root.render(<CarbonAd pathname="/browse" />))
    act(() => root.render(null))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(document.documentElement.dataset.carbonAdRequested).toBeUndefined()
    expect(document.documentElement.dataset.adDocumentPath).toBeUndefined()
  })
})
