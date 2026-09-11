// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CarbonAd } from "@/components/molecules/CarbonAd"
import { CARBON_SERVING_ORIGIN } from "@/lib/ads/config"

describe("Carbon loading hints in server HTML", () => {
  it.each(["/", "/member/overview", "/member/products/example"])(
    "prepares %s before hydration without executing an ad",
    (pathname) => {
      const html = renderToStaticMarkup(
        <CarbonAd pathname={pathname} variant="banner" />,
      )
      expect(html).toContain('rel="preload"')
      expect(html).toContain('as="script"')
      expect(html).toContain('fetchPriority="low"')
      expect(html).toContain(`href="${CARBON_SERVING_ORIGIN}"`)
      expect(html).toMatch(/crossorigin="(?:anonymous)?"/)
      expect(html).not.toContain('media="')
      expect(html).not.toContain("<script")
      expect(html.indexOf('rel="preload"')).toBeLessThan(
        html.indexOf("data-carbon-placement"),
      )
    },
  )

  it("preloads the default placement on every screen", () => {
    const html = renderToStaticMarkup(<CarbonAd pathname="/browse" />)
    expect(html).toContain('rel="preload"')
    expect(html).not.toContain('media="')
    expect(html).not.toContain("hidden")
  })

  it.each(["/guides/product-launch-checklist", "/member/products"])(
    "does not preload Carbon on %s",
    (pathname) => {
      expect(renderToStaticMarkup(<CarbonAd pathname={pathname} />)).toBe("")
    },
  )

  it("deduplicates hints from multiple placements", () => {
    const html = renderToStaticMarkup(
      <>
        <CarbonAd pathname="/" variant="banner" />
        <CarbonAd pathname="/" variant="banner" />
      </>,
    )
    expect(html.match(/rel="preload"/g)).toHaveLength(1)
    expect(html.match(/rel="preconnect"/g)).toHaveLength(1)
  })
})
