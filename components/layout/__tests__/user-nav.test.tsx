import { render, screen } from "@testing-library/react"
import { UserNav } from "@/components/layout/user-nav"
import { vi } from "vitest"

vi.mock("@/components/atoms/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <button>{children}</button>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div role="separator" />,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Jane Doe",
      emailAddresses: [{ emailAddress: "jane@example.com" }],
    },
  }),
  SignOutButton: ({ children }: any) => <>{children}</>,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("UserNav", () => {
  it("renders user info and menu items when signed in", () => {
    render(<UserNav />)
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument()
    expect(screen.getByText(/Profile/)).toBeInTheDocument()
    expect(screen.getByText(/Sign Out/)).toBeInTheDocument()
  })
})
