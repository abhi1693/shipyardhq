import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

// Mock next-themes to control the returned theme
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark" }),
}))

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
  it("passes theme from useTheme and forwards props", () => {
    render(<Toaster position="top-center" className="extra" />)
    const el = screen.getByTestId("sonner")
    expect(el).toHaveAttribute("data-theme", "dark")
    expect(el).toHaveClass("extra")
    expect(el).toHaveAttribute("data-position", "top-center")
    // Inline CSS vars should be present
    const style = (el as HTMLElement).getAttribute("style") || ""
    expect(style).toContain("--normal-bg")
    expect(style).toContain("--normal-text")
    expect(style).toContain("--normal-border")
  })
})
