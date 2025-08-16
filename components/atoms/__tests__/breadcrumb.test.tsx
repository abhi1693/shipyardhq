import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/atoms/breadcrumb"

describe("Breadcrumb atoms", () => {
  it("renders list with link, separator (default), and page", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    )

    expect(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/home",
    )
    // Default separator uses an SVG chevron
    const sep = document.querySelector(
      '[data-slot="breadcrumb-separator"]',
    ) as HTMLElement
    expect(sep.querySelector("svg")).toBeTruthy()
    // Page has aria-current
    expect(screen.getByText("Current")).toHaveAttribute("aria-current", "page")
  })

  it("renders ellipsis and custom separator content", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>First</BreadcrumbItem>
          <BreadcrumbSeparator>-</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    )
    // Custom separator content present
    const customSep = document.querySelector(
      '[data-slot="breadcrumb-separator"]',
    ) as HTMLElement
    expect(customSep).toHaveTextContent("-")
    // Ellipsis has hidden label More
    const ellipsis = document.querySelector(
      '[data-slot="breadcrumb-ellipsis"]',
    ) as HTMLElement
    expect(ellipsis.textContent).toContain("More")
  })
})
