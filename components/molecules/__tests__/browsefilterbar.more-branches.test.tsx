import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BROWSE_PATH } from "@/lib/routes"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchStr),
}))

// Mock InlineSelect to drive the "undefined/__all__" branch in buildUrl
vi.mock("@/components/molecules/InlineSelect", () => ({
  __esModule: true,
  default: ({ onValueChange }: any) => (
    <button onClick={() => onValueChange("__all__")} aria-label="Sort Select" />
  ),
}))

import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"

describe("BrowseFilterBar buildUrl undefined branch", () => {
  const useCases = [{ id: "u1", slug: "scoring", label: "Scoring" }]
  const categories = [{ id: "c1", slug: "analytics", name: "Analytics" }]

  beforeEach(() => {
    push.mockReset()
    searchStr = "useCase=scoring&verified=true"
  })

  it("omits sort param when InlineSelect passes __all__ and resets page", async () => {
    const user = userEvent.setup()
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ sort: "trending", useCase: "scoring", verified: true }}
      />,
    )
    await user.click(screen.getByLabelText("Sort Select"))
    const url = (push as any).mock.calls[0][0] as string
    expect(url).toContain(`${BROWSE_PATH}?`)
    expect(url).not.toContain("sort=")
    expect(url).toContain("page=1")
  })
})
