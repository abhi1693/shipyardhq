import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

// Mock sonner to expose received props for assertion
vi.mock("sonner", () => ({
  Toaster: (props: any) => (
    <div
      data-testid="sonner"
      data-theme={props.theme}
      className={props.className}
      style={props.style}
      data-position={props.position}
    />
  ),
}))

import { Toaster } from "@/components/atoms/sonner"

describe("Toaster (sonner wrapper)", () => {
  it("uses light theme by default and forwards props", () => {
    render(<Toaster position="top-center" className="extra" />)
    const el = screen.getByTestId("sonner")
    expect(el).toHaveAttribute("data-theme", "light")
    expect(el).toHaveClass("extra")
    expect(el).toHaveAttribute("data-position", "top-center")
    // Inline CSS vars should be present
    const style = (el as HTMLElement).getAttribute("style") || ""
    expect(style).toContain("--normal-bg")
    expect(style).toContain("--normal-text")
    expect(style).toContain("--normal-border")
  })

  it("allows overriding the theme", () => {
    render(<Toaster theme="dark" />)
    const el = screen.getByTestId("sonner")
    expect(el).toHaveAttribute("data-theme", "dark")
  })
})
