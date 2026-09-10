import { afterEach, describe, expect, it, vi } from "vitest"

import {
  claimAdDocument,
  handleAdDocumentClick,
  reloadAdDocumentIfNeeded,
} from "@/lib/ads/document"

afterEach(() => {
  delete document.documentElement.dataset.adDocumentPath
  delete document.documentElement.dataset.adDocumentReloading
  document.body.replaceChildren()
  history.replaceState(null, "", "/")
})

describe("ad document navigation", () => {
  it("keeps Carbon attached to the current document", () => {
    expect(claimAdDocument()).toBe(true)
    expect(claimAdDocument()).toBe(true)
    expect(document.documentElement.dataset.adDocumentPath).toBe("/")
  })

  it("requests one document reload before loading Carbon on another path", () => {
    // jsdom reports navigation as unimplemented; the real browser smoke check
    // verifies the document actually changes, including history navigation.
    vi.spyOn(console, "error").mockImplementation(() => {})
    claimAdDocument()
    history.pushState(null, "", "/browse")
    expect(claimAdDocument()).toBe(false)
    expect(document.documentElement.dataset.adDocumentReloading).toBe("true")
    expect(reloadAdDocumentIfNeeded()).toBe(true)
    expect(document.documentElement.dataset.adDocumentPath).toBe("/")
  })

  function click(href: string, options: MouseEventInit = {}, target?: string) {
    const link = document.createElement("a")
    link.href = href
    if (target) link.target = target
    document.body.appendChild(link)
    // Avoid jsdom's own async navigation; exercise our capture handler only.
    link.addEventListener("click", (event) => event.preventDefault())
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ...options,
    })
    Object.defineProperty(event, "target", { value: link })
    handleAdDocumentClick(event)
    return event
  }

  it("leaves same-path filters, anchors and external or new-tab links alone", () => {
    history.replaceState(null, "", "/browse")
    claimAdDocument()
    expect(click("/browse?q=tools").defaultPrevented).toBe(false)
    expect(click("/browse#results").defaultPrevented).toBe(false)
    expect(click("https://example.com").defaultPrevented).toBe(false)
    expect(click("/guides", {}, "_blank").defaultPrevented).toBe(false)
    expect(click("/guides", { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(click("/guides", { metaKey: true }).defaultPrevented).toBe(false)
    expect(click("/guides", { button: 1 }).defaultPrevented).toBe(false)
  })

  it("uses document navigation for ordinary links leaving an ad page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    history.replaceState(null, "", "/browse")
    claimAdDocument()
    expect(click("/guides/product-launch-checklist").defaultPrevented).toBe(
      true,
    )
  })

  it("keeps client navigation when the document has not loaded Carbon", () => {
    expect(click("/browse").defaultPrevented).toBe(false)
    expect(reloadAdDocumentIfNeeded()).toBe(false)
  })
})
