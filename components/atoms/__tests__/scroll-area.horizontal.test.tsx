import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { vi } from "vitest"

// Mock Radix ScrollArea primitives to avoid conditional rendering based on overflow
vi.mock("@radix-ui/react-scroll-area", () => ({
  ScrollAreaScrollbar: (props: any) => (
    <div data-slot="scroll-area-scrollbar" {...props} />
  ),
  ScrollAreaThumb: (props: any) => (
    <div data-slot="scroll-area-thumb" {...props} />
  ),
  Root: (props: any) => <div data-slot="scroll-area-root" {...props} />,
  Viewport: (props: any) => <div data-slot="scroll-area-viewport" {...props} />,
  Corner: (props: any) => <div data-slot="scroll-area-corner" {...props} />,
}))

import { ScrollBar } from "@/components/atoms/scroll-area"

describe("ScrollArea horizontal branch", () => {
  it("applies horizontal classes when orientation is horizontal", () => {
    const { container } = render(
      (<ScrollBar orientation="horizontal" />) as any,
    )
    const el = container.querySelector(
      '[data-slot="scroll-area-scrollbar"]',
    ) as HTMLElement
    expect(el).toBeTruthy()
    expect(el.className).toMatch(/flex-col/)
  })
})
