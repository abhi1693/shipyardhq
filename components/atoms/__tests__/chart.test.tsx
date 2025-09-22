import { render } from "@testing-library/react"
import React from "react"

import { ChartContainer, ChartTooltip } from "@/components/atoms/chart"

const hexToRgb = (value: string) => {
  if (!value.startsWith("#")) return value

  const hex = value.slice(1)
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)

  return `rgb(${r}, ${g}, ${b})`
}

describe("ChartContainer", () => {
  it("applies CSS variables and renders a legend when requested", () => {
    const config = {
      revenue: { label: "Revenue", color: "#3366ff" },
      users: { label: "Users", color: "#ff6633" },
    }

    const { container, getByText } = render(
      <ChartContainer config={config} showLegend>
        <div>inside</div>
      </ChartContainer>,
    )

    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue("--chart-revenue")).toBe("#3366ff")
    expect(root.style.getPropertyValue("--chart-users")).toBe("#ff6633")
    expect(getByText("Revenue")).toBeInTheDocument()
    expect(getByText("Users")).toBeInTheDocument()
  })

  it("forwards refs and merges custom styles without config", () => {
    const ref = React.createRef<HTMLDivElement>()
    const { container } = render(
      <ChartContainer
        ref={ref}
        className="extra"
        style={{ backgroundColor: "rgb(255, 0, 0)" }}
      >
        <div>content</div>
      </ChartContainer>,
    )

    const root = container.firstElementChild as HTMLElement
    expect(ref.current).toBe(root)
    expect(root.className).toContain("extra")
    expect(root.style.backgroundColor).toBe("rgb(255, 0, 0)")
    expect(root.style.getPropertyValue("--chart-sample")).toBe("")
  })
})

describe("ChartTooltip", () => {
  const numberFormatter = Intl.NumberFormat()

  it("returns null when inactive or no payload", () => {
    const { container } = render(
      <ChartContainer>
        <ChartTooltip active={false} payload={[]} label="Ignored" />
      </ChartContainer>,
    )

    expect(container.querySelector(".rounded-lg.border-slate-200")).toBeNull()
  })

  it("returns null when all payload entries are filtered out", () => {
    const payload = [
      {
        dataKey: "ignored",
        name: "Ignored",
        value: null,
      },
      null,
    ]

    const { container } = render(
      <ChartContainer>
        <ChartTooltip active payload={payload as any} label="Unused" />
      </ChartContainer>,
    )

    expect(container.querySelector(".rounded-lg.border-slate-200")).toBeNull()
  })

  it("renders entries from payload with config driven colors", () => {
    const config = {
      revenue: { label: "Revenue", color: "#123456" },
      visitors: { label: "Visitors" },
    }

    const payload = [
      {
        dataKey: "revenue",
        name: "Revenue",
        value: 1200,
        color: "#abcdef",
        payload: { label: "Week 1" },
      },
      {
        dataKey: "visitors",
        name: "Visitors",
        value: "99",
        payload: { browserLabel: "Chrome" },
      },
      {
        dataKey: "ignored",
        name: "Ignored",
        value: null,
      },
    ]

    const { container, getByText } = render(
      <ChartContainer config={config}>
        <ChartTooltip active payload={payload as any} label={{}} />
      </ChartContainer>,
    )

    expect(getByText("Week 1")).toBeInTheDocument()

    const rows = container.querySelectorAll(".flex.items-center.gap-2")
    expect(rows).toHaveLength(2)

    const revenueSwatch = rows[0].querySelector(
      "span[aria-hidden='true']",
    ) as HTMLElement
    const visitorsSwatch = rows[1].querySelector(
      "span[aria-hidden='true']",
    ) as HTMLElement

    expect(revenueSwatch.style.backgroundColor).toBe(
      hexToRgb(config.revenue.color),
    )
    expect(visitorsSwatch.style.backgroundColor).toBe("var(--chart-visitors)")

    const revenueValue = rows[0].querySelector(".font-semibold") as HTMLElement
    const visitorsValue = rows[1].querySelector(".font-semibold") as HTMLElement

    expect(revenueValue.textContent).toBe(numberFormatter.format(1200))
    expect(visitorsValue.textContent).toBe(numberFormatter.format(99))
  })

  it("derives tooltip labels from payload metadata in priority order", () => {
    const scenarios: Array<{
      payloadMeta: Record<string, string>
      expected: string
    }> = [
      { payloadMeta: { browserLabel: "Safari" }, expected: "Label: Safari" },
      { payloadMeta: { country: "USA" }, expected: "Label: USA" },
      { payloadMeta: { referrer: "Twitter" }, expected: "Label: Twitter" },
      { payloadMeta: { name: "Fallback" }, expected: "Label: Fallback" },
      { payloadMeta: {}, expected: "Label: " },
    ]

    for (const scenario of scenarios) {
      const { container, unmount } = render(
        <ChartContainer
          config={{ visitors: { label: "Visitors", color: "#654321" } }}
        >
          <ChartTooltip
            active
            payload={
              [
                {
                  dataKey: "visitors",
                  name: "Visitors",
                  value: 75,
                  payload: scenario.payloadMeta,
                },
              ] as any
            }
            label={undefined}
            labelFormatter={(derivedLabel) => `Label: ${derivedLabel}`}
          />
        </ChartContainer>,
      )

      const labelElement = container.querySelector(
        ".mb-2.font-medium.text-slate-500",
      )
      expect(labelElement?.textContent).toBe(scenario.expected)
      unmount()
    }
  })

  it("supports custom value formatting and hiding the label", () => {
    const payload = [
      {
        dataKey: "sales",
        value: 42,
        payload: { country: "USA" },
      },
    ]

    const { queryByText, getByText } = render(
      <ChartContainer config={{ sales: { label: "Sales" } }}>
        <ChartTooltip
          active
          hideLabel
          label="Should hide"
          valueFormatter={(value, key) => `${key}:$${value}`}
          payload={payload as any}
        />
      </ChartContainer>,
    )

    expect(queryByText("Should hide")).toBeNull()
    expect(getByText("sales:$42")).toBeInTheDocument()
  })
})
