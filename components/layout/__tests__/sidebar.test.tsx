import { render, screen } from "@testing-library/react"
import AppSidebar from "@/components/layout/sidebar"
import { SidebarProvider } from "@/components/atoms/sidebar"
import { vi } from "vitest"
import type { NavItem } from "@/types"
import { ADMIN_OVERVIEW_PATH, adminPath } from "@/lib/routes"

vi.mock("next/navigation", () => ({
  usePathname: () => ADMIN_OVERVIEW_PATH,
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
  it("renders admin nav items without search", () => {
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
      { title: "Overview", url: ADMIN_OVERVIEW_PATH, icon: "logo" as any },
      {
        title: "Users",
        icon: "logo" as any,
        items: [
          { title: "All Users", url: adminPath("users"), label: "2" },
          { title: "Invites", url: adminPath("invites") },
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
    expect(screen.queryByPlaceholderText(/Search navigation/i)).toBeNull()
  })
})
