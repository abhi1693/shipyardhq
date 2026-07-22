import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

import { VisitorSparkline } from "@/components/templates/public/homepage/VisitorSparkline"

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

describe("VisitorSparkline", () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container?.remove()
    container = null
    vi.restoreAllMocks()
  })

  it("shows the date and visitor count for the hovered point", () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <VisitorSparkline
          label="Last 2 days"
          series={[
            { date: "2026-07-19T00:00:00.000Z", visitors: 120 },
            { date: "2026-07-20T00:00:00.000Z", visitors: 250 },
          ]}
        />,
      )
    })

    const chart = container.querySelector<HTMLDivElement>("div.relative")
    expect(chart).not.toBeNull()
    vi.spyOn(chart!, "getBoundingClientRect").mockReturnValue({
      bottom: 32,
      height: 32,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    act(() => {
      chart?.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 319,
        }),
      )
    })

    const tooltip = container.querySelector('[role="tooltip"]')
    expect(tooltip).toHaveTextContent("Jul 20, 2026")
    expect(tooltip).toHaveTextContent("250 visitors")
  })

  it("lets keyboard users inspect each day without a floating popup", () => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <VisitorSparkline
          label="Last 2 days"
          series={[
            { date: "2026-07-19T00:00:00.000Z", visitors: 120 },
            { date: "2026-07-20T00:00:00.000Z", visitors: 250 },
          ]}
        />,
      )
    })

    const chart = container.querySelector<HTMLDivElement>("div.relative")

    act(() => {
      chart?.focus()
      chart?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowLeft",
        }),
      )
    })

    const tooltip = container.querySelector('[role="tooltip"]')
    expect(tooltip).toHaveTextContent("Jul 19, 2026")
    expect(tooltip).toHaveTextContent("120 visitors")
  })
})
