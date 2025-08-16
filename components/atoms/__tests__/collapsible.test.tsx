import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/atoms/collapsible"

describe("Collapsible atom", () => {
  it("renders content element and toggles data-state", () => {
    const { rerender, container } = render(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Inner</CollapsibleContent>
      </Collapsible>,
    )
    const content = container.querySelector(
      '[data-slot="collapsible-content"]',
    ) as HTMLElement
    expect(content).toBeTruthy()
    expect(content.getAttribute("data-state")).toBe("open")

    // Controlled: close and verify data-state changes
    rerender(
      <Collapsible open={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Inner</CollapsibleContent>
      </Collapsible>,
    )
    const content2 = container.querySelector(
      '[data-slot="collapsible-content"]',
    ) as HTMLElement
    expect(content2.getAttribute("data-state")).toBe("closed")
  })
})
