import { render } from "@testing-library/react"
import React from "react"

import { ChartContainer, ChartTooltip } from "@/components/atoms/chart"

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
      <ChartContainer ref={ref} className="extra" style={{ backgroundColor: "rgb(255, 0, 0)" }}>
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

    const revenueSwatch = rows[0].querySelector("span[aria-hidden='true']") as HTMLElement
    const visitorsSwatch = rows[1].querySelector("span[aria-hidden='true']") as HTMLElement

    expect(revenueSwatch.style.backgroundColor).toBe("#123456")
    expect(visitorsSwatch.style.backgroundColor).toBe("var(--chart-visitors)")

    const revenueValue = rows[0].querySelector(".font-semibold") as HTMLElement
    const visitorsValue = rows[1].querySelector(".font-semibold") as HTMLElement

    expect(revenueValue.textContent).toBe(numberFormatter.format(1200))
    expect(visitorsValue.textContent).toBe(numberFormatter.format(99))
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

