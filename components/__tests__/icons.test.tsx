import { render } from "@testing-library/react"
import React from "react"
import { Icons } from "../icons"

describe("Icons mapping", () => {
  it("exports a stable set of icon keys", () => {
    const keys = Object.keys(Icons).sort()
    expect(keys).toEqual(
      [
        "add",
        "bell",
        "billing",
        "building",
        "category",
        "dashboard",
        "link",
        "logo",
        "media",
        "member",
        "product",
        "settings",
        "user",
      ].sort(),
    )
  })

  it("renders each icon component as an SVG without crashing", () => {
    for (const [name, Cmp] of Object.entries(Icons)) {
      const { container, unmount } = render(
        <Cmp data-testid={`icon-${name}`} />,
      )
      // Tabler icons render as <svg> elements
      const svg = container.querySelector("svg")
      expect(svg).toBeTruthy()
      unmount()
    }
  })
})
