import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import SaveButton from "@/components/molecules/SaveButton"

describe("SaveButton", () => {
  it("renders default success variant with label and icon", () => {
    render(<SaveButton data-testid="btn" />)
    const btn = screen.getByTestId("btn")
    expect(btn.textContent).toContain("Save")
    // lucide icon renders an svg
    expect(btn.querySelector("svg")).toBeTruthy()
  })

  it("renders children over label and allows custom class/variant", () => {
    render(
      <SaveButton variant="secondary" className="extra">
        Go
      </SaveButton>,
    )
    const btn = screen.getByRole("button", { name: "Go" })
    expect(btn).toHaveClass("extra")
  })
})
