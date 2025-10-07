import { render, screen } from "@testing-library/react"
import PublicHeader from "@/components/layout/headers/public-header"
import { vi } from "vitest"
import { BROWSE_PATH } from "@/lib/routes"

// Mock next/navigation to control pathname
vi.mock("next/navigation", () => ({
  usePathname: () => BROWSE_PATH,
  useSearchParams: () => new URLSearchParams(),
}))

// Minimal Clerk mocks: render children as-is
vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: any) => <>{children}</>,
  SignedOut: ({ children }: any) => <>{children}</>,
  SignOutButton: ({ children }: any) => <>{children}</>,
  SignInButton: ({ children }: any) => <>{children}</>,
}))

describe("PublicHeader", () => {
  it("renders brand and nav links with active state", () => {
    render(<PublicHeader />)

    // Brand link exists (desktop and mobile render two)
    expect(
      screen.getAllByRole("link", { name: /ShipYardHQ home/i }).length,
    ).toBeGreaterThan(0)

    // Nav links exist
    const browse = screen.getAllByRole("link", { name: /Browse/i })[0]
    expect(browse).toBeInTheDocument()
    // Active class applied for current pathname
    expect(browse.className).toMatch(/text-foreground/)

    expect(screen.queryByRole("link", { name: /Categories/i })).toBeNull()
    expect(
      screen.getAllByRole("link", { name: /Leaderboard/i })[0],
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("link", { name: /Analytics/i })[0],
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("link", { name: /Pricing/i })[0],
    ).toBeInTheDocument()
  })
})
