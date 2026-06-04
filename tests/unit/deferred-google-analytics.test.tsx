import { afterEach, describe, expect, it, vi } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"

import { DeferredGoogleAnalytics } from "@/components/analytics/DeferredGoogleAnalytics"

const GA_ID = "G-TEST123"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

interface AnalyticsTestWindow extends Window {
  dataLayer?: IArguments[]
  gtag?: (...args: [string, ...unknown[]]) => void
}

function queryGaScript() {
  return document.querySelector<HTMLScriptElement>(
    `script[data-shipyard-ga="${GA_ID}"]`,
  )
}

describe("DeferredGoogleAnalytics", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount()
      })
      root = null
    }
    container?.remove()
    container = null

    document
      .querySelectorAll("script[data-shipyard-ga]")
      .forEach((script) => script.remove())

    const analyticsWindow = window as AnalyticsTestWindow
    delete analyticsWindow.dataLayer
    delete analyticsWindow.gtag
    delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]
    vi.restoreAllMocks()
  })

  function renderDeferredGoogleAnalytics() {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(<DeferredGoogleAnalytics gaId={GA_ID} />)
    })
  }

  it("waits for the window load event before injecting gtag", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading")

    renderDeferredGoogleAnalytics()

    expect(queryGaScript()).toBeNull()

    act(() => {
      window.dispatchEvent(new Event("load"))
    })

    const script = queryGaScript()
    expect(script).not.toBeNull()
    expect(script).toHaveAttribute(
      "src",
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
    )
    expect(script?.async).toBe(true)

    const analyticsWindow = window as AnalyticsTestWindow
    expect(analyticsWindow.dataLayer).toHaveLength(2)
    expect(Object.prototype.toString.call(analyticsWindow.dataLayer?.[0])).toBe(
      "[object Arguments]",
    )
    expect(analyticsWindow.dataLayer?.[0]?.[0]).toBe("js")
    expect(analyticsWindow.dataLayer?.[1]?.[0]).toBe("config")
    expect(analyticsWindow.dataLayer?.[1]?.[1]).toBe(GA_ID)
  })

  it("loads immediately when mounted after the page has already loaded", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete")

    renderDeferredGoogleAnalytics()

    expect(queryGaScript()).not.toBeNull()
  })

  it("respects the ga-disable flag", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete")
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] =
      true

    renderDeferredGoogleAnalytics()

    expect(queryGaScript()).toBeNull()
  })
})
