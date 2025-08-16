import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarInput,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenuSubButton,
} from "@/components/atoms/sidebar"

// Desktop (non-mobile)
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))

describe("Sidebar groups and misc parts", () => {
  it("renders header/footer/separator/input/inset", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>H</SidebarHeader>
          <SidebarSeparator />
          <SidebarInput aria-label="inp" />
          <SidebarFooter>F</SidebarFooter>
        </Sidebar>
        <SidebarInset>Inset</SidebarInset>
      </SidebarProvider>,
    )
    expect(screen.getByText("H")).toBeInTheDocument()
    expect(screen.getByText("F")).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="sidebar-separator"]'),
    ).toBeTruthy()
    expect(screen.getByLabelText("inp")).toBeInTheDocument()
    expect(screen.getByText("Inset")).toBeInTheDocument()
  })

  it("group label/action respond to icon-collapsed state and asChild composition", () => {
    render(
      <SidebarProvider open={false}>
        <Sidebar collapsible="icon">
          <SidebarGroup>
            <SidebarGroupLabel>Label</SidebarGroupLabel>
            <SidebarGroupAction asChild>
              <button data-testid="act">A</button>
            </SidebarGroupAction>
            <SidebarGroupContent>Content</SidebarGroupContent>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>,
    )
    const label = document.querySelector(
      '[data-slot="sidebar-group-label"]',
    ) as HTMLElement
    expect(label.className).toContain("group-data-[collapsible=icon]")
    // asChild passes attributes to child (button present)
    expect(screen.getByTestId("act")).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="sidebar-group-content"]'),
    ).toBeTruthy()
  })

  it("menu sub button supports asChild composition", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenuSubButton asChild data-active data-size="sm">
                <a href="#" data-testid="sub-aschild">
                  Go
                </a>
              </SidebarMenuSubButton>
            </SidebarGroupContent>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>,
    )
    const sub = screen.getByTestId("sub-aschild")
    // attributes should be applied to child element by Slot
    expect(sub.getAttribute("data-active")).toBe("true")
    expect(sub.getAttribute("data-size")).toBe("sm")
  })
})
