import { render, screen } from "@testing-library/react"
import PageContainer from "@/components/layout/page-container"
import Providers from "@/components/layout/providers"
import { vi } from "vitest"

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark" }),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/member",
}))

// Stub ClerkProvider to a pass-through for this test
vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: any) => <>{children}</>,
  useUser: () => ({ isLoaded: true, isSignedIn: false }),
}))

describe("PageContainer", () => {
  it("renders children without scroll area", () => {
    render(
      <PageContainer>
        <div>Inner</div>
      </PageContainer>,
    )
    expect(screen.getByText("Inner")).toBeInTheDocument()
  })

  it("wraps content in ScrollArea when scrollable", () => {
    render(
      <PageContainer scrollable>
        <div>Scrollable</div>
      </PageContainer>,
    )
    expect(screen.getByText("Scrollable")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="scroll-area"]')).toBeTruthy()
  })
})

describe("Providers", () => {
  it("renders children inside ClerkProvider", () => {
    render(
      <Providers>
        <div>Provided</div>
      </Providers>,
    )
    expect(screen.getByText("Provided")).toBeInTheDocument()
  })
})
