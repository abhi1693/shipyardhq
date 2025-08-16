import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe("ProductMediaManager dragover", () => {
  it("prevents default on dragover over the drop zone", () => {
    render(
      <ProductMediaManager
        productId="p1"
        canEdit
        max={3}
        media={[]}
      />,
    )
    const label = screen.getByText(/Drag & drop images/i).closest("label")!
    const preventDefault = vi.fn()
    fireEvent.dragOver(label, { preventDefault })
    expect(preventDefault).toHaveBeenCalled()
  })
})

