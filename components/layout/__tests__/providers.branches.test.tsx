import React from "react"
import { render } from "@testing-library/react"
import { vi } from "vitest"
import { MEMBER_BASE_PATH } from "@/lib/routes"

// Mock ClerkProvider to capture received props
const clerkSpy = vi.fn()
vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children, ...props }: any) => {
    clerkSpy(props)
    return <div data-testid="clerk">{children}</div>
  },
  useUser: () => ({ isLoaded: true, isSignedIn: true }),
}))

vi.mock("next/navigation", () => ({ usePathname: () => MEMBER_BASE_PATH }))
import Providers from "@/components/layout/providers"

describe("Providers appearance", () => {
  beforeEach(() => {
    clerkSpy.mockClear()
  })

  it("renders without passing dark appearance overrides", () => {
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )
    expect(clerkSpy).toHaveBeenCalledWith({})
  })
})
