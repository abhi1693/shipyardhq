import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
let searchStr = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(searchStr),
}))
// Mock InlineSelect to avoid Radix pointer interactions; a simple button triggers onValueChange
vi.mock("@/components/molecules/InlineSelect", () => ({
  __esModule: true,
  default: ({ onValueChange }: any) => (
    <button onClick={() => onValueChange("votes")} aria-label="Sort Select" />
  ),
}))

import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"

describe("BrowseFilterBar sort changes", () => {
  const useCases = [{ id: "u1", slug: "scoring", label: "Scoring" }]
  const categories = [{ id: "c1", slug: "analytics", name: "Analytics" }]

  it("updates sort via InlineSelect and preserves existing params, resets page=1", async () => {
    const user = userEvent.setup()
    searchStr = "useCase=scoring&verified=true"
    render(
      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ sort: "new", useCase: "scoring", verified: true }}
      />,
    )
    await user.click(screen.getByLabelText("Sort Select"))
    const url = (push as any).mock.calls[0][0] as string
    expect(url).toContain("/browse?")
    expect(url).toContain("useCase=scoring")
    expect(url).toContain("verified=true")
    expect(url).toContain("sort=votes")
    expect(url).toContain("page=1")
  })
})
