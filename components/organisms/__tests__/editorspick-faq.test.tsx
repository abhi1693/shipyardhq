import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditorsPick } from "@/components/organisms/EditorsPick"
import { FaqSection, FAQ_ITEMS } from "@/components/organisms/FaqSection"

describe("EditorsPick", () => {
  it("returns null when no products", () => {
    const { container } = render(<EditorsPick products={[]} as any />)
    expect(container.firstChild).toBeNull()
  })

  it("renders header and grid when products provided", () => {
    const items = [
      {
        id: "fb1",
        product: {
          id: "p1",
          slug: "a",
          name: "A",
          logo: "/a.png",
          tagline: "tag",
          ProductBadge: [],
          analytics: { upvotes: 0 },
          user: { firstName: "E", lastName: "P" },
          category: { name: "Cat" },
        },
      },
    ]
    render(<EditorsPick products={items as any} />)
    expect(screen.getByText("Editor’s Picks")).toBeInTheDocument()
  })
})

describe("FaqSection", () => {
  it("renders all questions and answers", async () => {
    render(<FaqSection />)
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument()
    FAQ_ITEMS.forEach(({ question }) => {
      expect(screen.getByRole("button", { name: question })).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(
      screen.getByRole("button", {
        name: "How do I manage billing or cancel an upgrade?",
      }),
    )
    expect(
      screen.getByText(/Customer Portal link in the member sidebar/i),
    ).toBeInTheDocument()
  })
})
