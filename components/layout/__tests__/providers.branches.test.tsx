import React from "react"
import { render } from "@testing-library/react"
import { vi } from "vitest"

// Mock ClerkProvider to expose baseTheme presence
const clerkSpy = vi.fn()
vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ appearance, children }: any) => {
    clerkSpy(appearance?.baseTheme ? "dark" : "light")
    return <div data-testid="clerk">{children}</div>
  },
  useUser: () => ({ isLoaded: true, isSignedIn: true }),
}))

let currentTheme = "dark"
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: currentTheme }) }))
import Providers from "@/components/layout/providers"

describe("Providers appearance", () => {
  it("uses dark baseTheme when theme is dark", () => {
    currentTheme = "dark"
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )
    expect(clerkSpy).toHaveBeenCalledWith("dark")
  })

  it("uses default appearance when theme is not dark", () => {
    currentTheme = "light"
    render(
      <Providers>
        <div>child</div>
      </Providers>,
    )
    expect(clerkSpy).toHaveBeenCalledWith("light")
  })
})
