import React from "react"
import { render, screen } from "@testing-library/react"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe("ProductMediaManager no-edit existing media", () => {
  it("renders media without delete controls when cannot edit", () => {
    render(
      <ProductMediaManager
        productId="p1"
        canEdit={false}
        max={3}
        media={[{ id: "m1", imageUrl: "/a.png" }]}
      />,
    )
    // Image is present
    expect(document.querySelector('img[src="/a.png"]')).toBeTruthy()
    // Delete button is not rendered
    expect(screen.queryByRole("button", { name: /Remove image/i })).toBeNull()
  })
})
