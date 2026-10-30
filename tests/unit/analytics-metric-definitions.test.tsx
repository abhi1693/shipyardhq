import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { AnalyticsMetricDefinitions } from "@/components/molecules/AnalyticsMetricDefinitions"

describe("traffic and outbound-click disclosures", () => {
  it("separates lifetime clicks from the selected traffic window", () => {
    const text = renderToStaticMarkup(
      <AnalyticsMetricDefinitions windowLabel="Last 7 days" scope="site" />,
    )
    expect(text).toContain("Traffic reporting period: Last 7 days")
    expect(text).toContain("Website clicks (lifetime)")
    expect(text).toContain("since tracking began")
    expect(text).toContain("without host, path, or bot filters")
    expect(text).toContain("not a count of unique people")
    expect(text).toContain("Repeated or automated clicks may be included")
    expect(text).toContain(
      "free listing redirects and eligible paid direct links",
    )
  })
  it("describes listing-path filtering without implying a bot filter", () => {
    const text = renderToStaticMarkup(
      <AnalyticsMetricDefinitions windowLabel="Last 30 days" />,
    )
    expect(text).toContain("listing paths, without a bot filter")
    expect(text).toContain("clicks do not establish signups or customers")
    expect(text).not.toContain("without host, path, or bot filters")
  })
  it("does not add a click metric to traffic-only panels", () => {
    const text = renderToStaticMarkup(
      <AnalyticsMetricDefinitions
        windowLabel="Last 2 days"
        includeClicks={false}
      />,
    )
    expect(text).not.toContain("Website clicks")
    expect(text).toContain("automated and repeated activity")
  })
})
