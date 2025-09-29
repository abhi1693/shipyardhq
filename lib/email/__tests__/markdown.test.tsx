import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  getEmailPreviewText,
  markdownToPlainText,
  renderEmailMarkdown,
} from "@/lib/email/markdown"

function renderMarkdown(markdown: string) {
  return render(<div>{renderEmailMarkdown(markdown)}</div>)
}

describe("email markdown utilities", () => {
  it("converts markdown to readable plain text", () => {
    const input = `# Heading

Hello **world**! Visit [Shipyard](https://shipyardhq.dev).

> Block quote here.

- Item one
- Item two

\`\`\`ts
const hi = "there"
\`\`\`
`

    const output = markdownToPlainText(input)

    expect(output).toContain("Heading")
    expect(output).toContain("Hello world! Visit Shipyard (https://shipyardhq.dev).")
    expect(output).toContain("Block quote here.")
    expect(output).toContain("Item one")
    expect(output).toContain("Item two")
    expect(output).toContain('const hi = "there"')
  })

  it("caps preview text to 140 characters", () => {
    const repeated = Array(20)
      .fill("Shipyard crew is shipping fast")
      .join(" ")
    const preview = getEmailPreviewText(`## Update\n\n${repeated}`)

    expect(preview?.length).toBeLessThanOrEqual(140)
    expect(preview).toMatch(/^Update Shipyard crew is shipping fast/)
  })

  it("returns undefined preview text when message is empty", () => {
    expect(getEmailPreviewText("   ")).toBeUndefined()
  })

  it("renders markdown with semantic elements", () => {
    const { container } = renderMarkdown(
      "Hello **crew**!\n\n- Item A\n- Item B\n\n\`\`\`\nconst value = 42\n\`\`\`\n",
    )

    expect(container.querySelector("p")).toHaveTextContent("Hello crew!")
    expect(container.querySelector("strong")).not.toBeNull()
    expect(container.querySelectorAll("li").length).toBe(2)
    expect(container.querySelector("pre code")).toHaveTextContent("const value = 42")
  })
})
