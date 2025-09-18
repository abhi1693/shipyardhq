import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

import { PricingFeature } from "@/components/molecules/PricingFeature"
import { PageHeader } from "@/components/molecules/PageHeader"
import PageSectionHeader from "@/components/molecules/PageSectionHeader"
import AddButton from "@/components/molecules/AddButton"
import SignOutCtaButton from "@/components/molecules/SignOutCtaButton"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import { Relationship } from "@/components/molecules/Relationship"

// Mock DataTable used by Relationship to avoid bringing in react-table details
vi.mock("@/components/molecules/DataTable", () => ({
  default: (props: any) => (
    <div data-testid="DataTable">rows:{props.data?.length}</div>
  ),
}))
// Mock breadcrumbs hook to avoid accessing next/navigation pathname
vi.mock("@/hooks/use-breadcrumbs", () => ({
  useBreadcrumbs: () => [],
}))

describe("additional molecules render and branch coverage", () => {
  it("PricingFeature renders enabled and disabled states", () => {
    const { rerender } = render(
      <ul>
        <PricingFeature
          label="A"
          enabled
          subtle
          description="desc"
          isExperimental
        />
      </ul>,
    )
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.getByText("Experimental")).toBeInTheDocument()
    expect(screen.getByTitle("desc")).toBeInTheDocument()
    rerender(
      <ul>
        <PricingFeature label="B" enabled={false} description="disabled" />
      </ul>,
    )
    expect(screen.getByText("B")).toBeInTheDocument()
    expect(screen.queryByText("Experimental")).not.toBeInTheDocument()
  })

  it("PageHeader renders with center alignment, underline, subtitle, meta", () => {
    render(
      <PageHeader
        title="Title"
        subtitle={<span>Sub</span>}
        align="center"
        underline
        meta={<span>Meta</span>}
      />,
    )
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Sub")).toBeInTheDocument()
    expect(screen.getByText("Meta")).toBeInTheDocument()
  })

  it("PageSectionHeader renders action when align left and hides when center", () => {
    const action = <button>Act</button>
    const { rerender } = render(
      <PageSectionHeader
        title="Section"
        subtitle="Sub"
        action={action}
        align="left"
        underline
      />,
    )
    expect(screen.getByText("Section")).toBeInTheDocument()
    expect(screen.getByText("Act")).toBeInTheDocument()
    rerender(
      <PageSectionHeader title="Section" action={action} align="center" />,
    )
    // action should not render when centered
    expect(screen.queryByText("Act")).not.toBeInTheDocument()
  })

  it("AddButton and SignOutCtaButton render default labels", () => {
    render(<AddButton />)
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument()
    render(<SignOutCtaButton />)
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument()
  })

  it("Breadcrumbs prepends Home and renders last as page", () => {
    render(<Breadcrumbs items={[{ title: "Foo", link: "/foo" }]} />)
    // Should contain Home … Foo
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Foo")).toBeInTheDocument()
  })

  it("CategoryIcon renders correct icon or null when not found", () => {
    const { rerender } = render(
      (<CategoryIcon icon={"bolt"} size={12} />) as any,
    )
    expect(document.querySelectorAll("svg").length).toBe(1)
    rerender((<CategoryIcon icon={"unknown"} />) as any)
    // null render => no icon
    expect(document.querySelectorAll("svg").length).toBe(0)
  })

  it("Relationship renders empty message and uses DataTable when rows exist", () => {
    const columns: any[] = []
    const { rerender } = render(
      <Relationship
        title="Rel"
        rows={[]}
        columns={columns}
        emptyMessage="Nothing"
      />,
    )
    expect(screen.getByText("Nothing")).toBeInTheDocument()
    rerender(<Relationship title="Rel" rows={[{ id: 1 }]} columns={columns} />)
    expect(screen.getByTestId("DataTable")).toHaveTextContent("rows:1")
  })
})
