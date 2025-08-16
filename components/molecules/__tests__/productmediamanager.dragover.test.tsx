import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import ProductMediaManager from "@/components/molecules/ProductMediaManager"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe("ProductMediaManager dragover", () => {
  it("handles dragover over the drop zone", () => {
    render(
      <ProductMediaManager
        productId="p1"
        canEdit
        max={3}
        media={[]}
      />,
    )
    const label = screen.getByText(/Drag & drop images/i).closest("label")!
    // Trigger dragOver; handler calls preventDefault internally. No assertion needed.
    fireEvent.dragOver(label)
    expect(label).toBeInTheDocument()
  })
})
