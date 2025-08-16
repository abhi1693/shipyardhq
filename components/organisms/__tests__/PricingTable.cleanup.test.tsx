import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { PricingTable } from "@/components/organisms/PricingTable"

describe("PricingTable cleanup", () => {
  it("removes resize listener on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener")
    const removeSpy = vi.spyOn(window, "removeEventListener")
    const plans: any[] = [
      {
        id: "free",
        name: "Free",
        description: "Desc",
        price: 0,
        productCount: 0,
        features: [],
      },
    ]
    const { unmount } = render(<PricingTable plans={plans as any} />)
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
