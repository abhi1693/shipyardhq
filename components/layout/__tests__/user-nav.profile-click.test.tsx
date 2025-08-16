import { render, screen, fireEvent } from "@testing-library/react"
import { UserNav } from "@/components/layout/user-nav"
import { vi } from "vitest"

// Mock dropdown menu so that onClick is preserved on the item
vi.mock("@/components/atoms/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <button>{children}</button>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div role="separator" />,
  DropdownMenuItem: ({ onClick, children }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

const push = vi.fn()
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
  useRouter: () => ({ push }),
}))

describe("UserNav profile click", () => {
  it("navigates to /admin/profile when Profile is clicked", () => {
    render(<UserNav />)
    const profile = screen.getByText(/Profile/)
    fireEvent.click(profile)
    expect(push).toHaveBeenCalledWith("/admin/profile")
  })
})
