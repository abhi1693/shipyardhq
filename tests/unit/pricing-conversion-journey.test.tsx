import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import {
  FreeLaunchDeliverable,
  PricingFinalCta,
  PricingMobileStickyCta,
} from "@/components/organisms/PricingConversionJourney"
import { MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("pricing conversion journey", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
    }
    container?.remove()
    root = null
    container = null
  })

  it("shows a concrete free deliverable and repeats the launch action", () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <>
          <FreeLaunchDeliverable />
          <PricingFinalCta />
          <PricingMobileStickyCta />
        </>,
      )
    })

    expect(container).toHaveTextContent(
      "Your launch ships with a public product page",
    )
    expect(container).toHaveTextContent(
      "Standard card in the homepage launch feed",
    )
    expect(container).toHaveTextContent(
      "Track views, visitors, audience insights, and upvotes",
    )
    expect(container).toHaveTextContent(
      "$0 to publish · One-time boosts never auto-renew",
    )

    const launchLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a"),
    ).filter((link) => link.textContent?.trim() === "Launch free")

    expect(launchLinks).toHaveLength(2)
    launchLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", MEMBER_PRODUCTS_ADD_PATH)
    })

    const mobileCta = container.querySelector(
      'aside[aria-label="Start a free Shipyard launch"]',
    )

    expect(mobileCta).toHaveAttribute("data-pricing-mobile-cta")
    expect(mobileCta).toHaveClass("md:hidden")
  })
})
