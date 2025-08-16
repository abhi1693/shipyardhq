import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import AppSidebar from "@/components/layout/sidebar"
import { SidebarProvider } from "@/components/atoms/sidebar"
import type { NavItem } from "@/types"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
}))

vi.mock("@/components/icons", () => ({
  Icons: new Proxy(
    {},
    { get: () => (props: any) => <svg data-testid="icon" {...props} /> },
  ),
}))

describe("AppSidebar filtering", () => {
  it("filters subitems by query when typing in search", () => {
    // Polyfill matchMedia used by use-mobile hook
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    const nav: NavItem[] = [
      { title: "Overview", url: "/admin/overview", icon: "logo" as any },
      {
        title: "Users",
        icon: "logo" as any,
        items: [
          { title: "All Users", url: "/admin/users", label: "2" },
          { title: "Invites", url: "/admin/invites" },
        ],
      },
    ]
    render(
      <SidebarProvider>
        <AppSidebar navItems={nav} />
      </SidebarProvider>,
    )
    // Type into search to filter to Invites only
    const input = screen.getByPlaceholderText(/Search navigation/i)
    fireEvent.change(input, { target: { value: "inv" } })
    expect(screen.getByText("Invites")).toBeInTheDocument()
    expect(screen.queryByText("All Users")).toBeNull()
  })
})
