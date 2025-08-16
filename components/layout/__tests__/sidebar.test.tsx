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

describe("AppSidebar", () => {
  it("renders admin nav items and search input", () => {
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

    expect(screen.getByText("Admin")).toBeInTheDocument()
    expect(screen.getAllByText("Overview")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Users")[0]).toBeInTheDocument()
    // Search input
    expect(
      screen.getByPlaceholderText(/Search navigation/i),
    ).toBeInTheDocument()
  })
})
