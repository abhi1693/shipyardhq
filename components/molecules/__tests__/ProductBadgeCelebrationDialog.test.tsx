import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"
import { siteConfig } from "@/lib/siteConfig"

describe("ProductBadgeCelebrationDialog", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { origin: "https://app.example" },
      writable: true,
    })
  })

  it("renders the badge preview and embed snippet when open", () => {
    render(<ProductBadgeCelebrationDialog open onOpenChange={() => {}} />)

    expect(
      screen.getByText(/congratulations on the new launch/i),
    ).toBeInTheDocument()
    expect(
      screen.getByAltText(`Featured on ${siteConfig.name}`),
    ).toBeInTheDocument()
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    expect(textarea.value).toContain("/featured-on-light.png")
    expect(textarea.value).toContain(siteConfig.url)
  })

  it("switches to the dark badge variant", async () => {
    const user = userEvent.setup()
    render(<ProductBadgeCelebrationDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole("button", { name: /dark badge/i }))

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    expect(textarea.value).toContain("/featured-on-dark.png")
  })
})
