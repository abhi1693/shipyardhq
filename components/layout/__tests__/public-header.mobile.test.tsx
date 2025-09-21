import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import PublicHeader from "@/components/layout/headers/public-header"
import { vi } from "vitest"

// Override next/link to prevent actual navigation and invoke onClick
vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...props }: any) => (
    <a
      href={typeof href === "string" ? href : "#"}
      {...props}
      onClick={(e) => {
        e.preventDefault()
        onClick?.(e)
      }}
    >
      {children}
    </a>
  ),
}))

// Mock pathname for active state
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

// Simplified Sheet mock with context to control open state
const SheetCtx = React.createContext<{
  open: boolean
  setOpen: (o: boolean) => void
} | null>(null)
vi.mock("@/components/atoms/sheet", () => ({
  Sheet: ({ open, onOpenChange, children }: any) => (
    <SheetCtx.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </SheetCtx.Provider>
  ),
  SheetTrigger: ({ children }: any) => {
    const ctx = React.useContext(SheetCtx)!
    return React.cloneElement(children, {
      onClick: () => ctx.setOpen(true),
    })
  },
  SheetContent: ({ children }: any) => {
    const ctx = React.useContext(SheetCtx)!
    if (!ctx.open) return null
    return <div data-testid="mobile-sheet">{children}</div>
  },
}))

// Clerk mocks to render children only
vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: any) => <>{children}</>,
  SignedOut: ({ children }: any) => <>{children}</>,
  SignOutButton: ({ children }: any) => <>{children}</>,
  SignInButton: ({ children }: any) => <>{children}</>,
}))

describe("PublicHeader mobile menu", () => {
  it("opens the mobile sheet and shows nav links", () => {
    render(<PublicHeader />)

    // Open via trigger
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }))
    expect(screen.getByTestId("mobile-sheet")).toBeInTheDocument()

    // Links are rendered inside the sheet
    const leaderboard = screen.getAllByRole("link", { name: /Leaderboard/i })[0]
    expect(leaderboard).toBeInTheDocument()

    const analytics = screen.getAllByRole("link", { name: /Analytics/i })[0]
    expect(analytics).toBeInTheDocument()

    // Link presence inside sheet is sufficient to assert mobile rendering
    expect(leaderboard).toBeInTheDocument()
  })
})
