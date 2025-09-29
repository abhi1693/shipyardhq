import { render, screen } from "@testing-library/react"
import PageContainer from "@/components/layout/page-container"
import Providers from "@/components/layout/providers"
import { vi } from "vitest"
import { MEMBER_BASE_PATH } from "@/lib/routes"

vi.mock("next/navigation", () => ({
  usePathname: () => MEMBER_BASE_PATH,
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
