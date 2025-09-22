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
    const save = screen.getByRole("button", { name: "Save draft" })
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
    const { container } = render(<WizardStepper steps={steps} step={2} />)
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)

    const currentLabel = screen.getByText("Two")
    expect(currentLabel.className).toContain("text-slate-900")

    const completedCircle = items[0].querySelector("div")
    expect(completedCircle?.className).toContain("bg-sky-100")

    const progressFill = container.querySelector('div[style*="width: 50%"]')
    expect(progressFill).toBeTruthy()
  })
})
