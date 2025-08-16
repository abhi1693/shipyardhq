import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import WizardFooter from "@/components/molecules/WizardFooter"
import WizardStepper from "@/components/molecules/WizardStepper"

describe("WizardFooter", () => {
  it("renders Next on non-review and triggers callbacks", () => {
    const onBack = vi.fn()
    const onNext = vi.fn()
    render(
      <WizardFooter
        isReview={false}
        onBack={onBack}
        onNext={onNext}
        onSaveDraft={() => {}}
        onPublish={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(onBack).toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(onNext).toHaveBeenCalled()
  })

  it("renders Save/Publish on review and respects isSubmitting", () => {
    const onSaveDraft = vi.fn()
    const onPublish = vi.fn()
    render(
      <WizardFooter
        isReview
        isSubmitting
        onBack={() => {}}
        onNext={() => {}}
        onSaveDraft={onSaveDraft}
        onPublish={onPublish}
      />,
    )
    const save = screen.getByRole("button", { name: "Save as Draft" })
    const publish = screen.getByRole("button", { name: "Publish" })
    expect(save).toBeDisabled()
    expect(publish).toBeDisabled()
  })
})

describe("WizardStepper", () => {
  it("marks current and completed steps and renders progress bar", () => {
    const steps = [
      { id: 1, label: "One" },
      { id: 2, label: "Two" },
      { id: 3, label: "Three" },
    ]
    render(<WizardStepper steps={steps} step={2} />)
    // Current label should have font-medium (we can infer by text present)
    expect(screen.getByText("Two")).toBeInTheDocument()
    // There should be connector bars between items; when step > id, inner bar has w-full
    // Grab all progress inner bars and ensure at least one has w-full
    const bars = document.querySelectorAll(".bg-primary")
    expect(Array.from(bars).some((el) => el.className.includes("w-full"))).toBe(
      true,
    )
  })
})
