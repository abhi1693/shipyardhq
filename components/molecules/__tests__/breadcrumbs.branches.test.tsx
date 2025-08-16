import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"

// Mock next/navigation for usePathname used by useBreadcrumbs fallback
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/products",
}))

describe("Breadcrumbs branches", () => {
  it("injects Home when first is not home and renders links/separators correctly", () => {
    render(
      <Breadcrumbs
        items={[{ title: "Admin", link: "/admin" }, { title: "Products" }]}
      />,
    )

    // Home injected as first with link
    const homeLink = screen.getByRole("link", { name: "Home" })
    expect(homeLink).toHaveAttribute("href", "/")

    // Intermediate item rendered as link
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    )

    // Last item rendered as breadcrumb-page (current page)
    const page = document.querySelector('[data-slot="breadcrumb-page"]')
    expect(page).toBeTruthy()
    expect(page?.textContent).toBe("Products")

    // There should be two links (Home, Admin) and a current page text (Products)
    const links = screen.getAllByRole("link")
    expect(links.map((n) => n.textContent)).toContain("Home")
    expect(links.map((n) => n.textContent)).toContain("Admin")
  })

  it("respects existing home and supports suffix", () => {
    render(
      <Breadcrumbs
        items={[
          { title: "Home", link: "/" },
          { title: "Dashboard", link: "/dashboard" },
          { title: "Stats" },
        ]}
        suffixItems={[{ title: "Details" }]}
      />,
    )

    // First link remains Home (no injection needed)
    const links = screen.getAllByRole("link")
    expect(links[0]).toHaveTextContent("Home")

    // Last page is the suffix last item
    expect(screen.getByText("Details")).toBeInTheDocument()
  })

  it("applies transform function to items", () => {
    const { rerender } = render(
      <Breadcrumbs
        items={[{ title: "x", link: "/x" }, { title: "y" }]}
        transform={(items) =>
          items.map((i) => ({ ...i, title: i.title.toUpperCase() }))
        }
      />,
    )
    expect(screen.getByText("X")).toBeInTheDocument()
    expect(screen.getByText("Y")).toBeInTheDocument()
  })
})
