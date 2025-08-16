import { render, screen } from "@testing-library/react"
import AppSidebar from "@/components/layout/sidebar"
import { SidebarProvider } from "@/components/atoms/sidebar"
import { vi } from "vitest"
import type { NavItem } from "@/types"

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/overview",
}))

// Mock Icons map to minimal components
vi.mock("@/components/icons", () => ({
  Icons: new Proxy(
    {},
    {
      get: () => (props: any) => <svg data-testid="icon" {...props} />,
    },
  ),
}))

describe("AppSidebar edge cases", () => {
  it("handles malformed urls (catch path), renders root labels and subitem icons", () => {
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
      // Malformed url to hit try/catch fallback path in isActivePath
      { title: "Broken", url: 123 as any, icon: "logo" as any, label: "X" },
      {
        title: "Users",
        icon: "logo" as any,
        items: [
          // Provide an icon on a subitem to render SubIcon branch
          { title: "All Users", url: "/admin/users", icon: "logo" as any },
          // Include an active subitem to default open the collapsible
          { title: "Overview", url: "/admin/overview" },
        ],
      },
    ]

    render(
      <SidebarProvider>
        <AppSidebar navItems={nav} />
      </SidebarProvider>,
    )

    // Root label rendered for the first item
    expect(screen.getByText("X")).toBeInTheDocument()
    // Subitem icon rendered (our mock renders <svg data-testid="icon" />)
    // and the subitem title is present
    expect(screen.getByText("All Users")).toBeInTheDocument()
    const icons = screen.getAllByTestId("icon")
    expect(icons.length).toBeGreaterThan(0)
  })
})
