import React from "react"
import { render } from "@testing-library/react"
import { UserNav } from "@/components/layout/user-nav"

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("UserNav signed out", () => {
  it("renders nothing when user is not present", () => {
    const { container } = render(<UserNav />)
    expect(container.firstChild).toBeNull()
  })
})
