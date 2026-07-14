import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  BrowserIcon,
  FlagIcon,
  OsIcon,
} from "@/components/molecules/AnalyticsShared"

describe("analytics country flags", () => {
  it("renders a flag image when requested", () => {
    const html = renderToStaticMarkup(
      <FlagIcon code="US" name="United States" variant="image" />,
    )

    expect(html).toContain('alt="United States flag"')
    expect(html).toContain(encodeURIComponent("https://flagcdn.com/w40/us.png"))
  })
})

describe("analytics operating-system icons", () => {
  it("resolves ChromeOS without requiring a space", () => {
    const html = renderToStaticMarkup(<OsIcon name="ChromeOS" />)

    expect(html).toContain('alt="Chrome OS logo"')
    expect(html).toContain("chrome-os.png")
  })

  it("renders a neutral icon for an unknown operating system", () => {
    const html = renderToStaticMarkup(<OsIcon name="Unknown" />)

    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Unknown operating system icon"')
  })
})

describe("analytics browser icons", () => {
  it("renders bot icons for crawler browser labels", () => {
    const html = renderToStaticMarkup(<BrowserIcon name="BingBot" />)

    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="BingBot bot icon"')
  })

  it("renders a neutral icon for an unknown browser", () => {
    const html = renderToStaticMarkup(<BrowserIcon name="Unknown" />)

    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Unknown browser icon"')
  })
})
