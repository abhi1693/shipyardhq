import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AnswerBlocks } from "@/components/templates/public/common/AnswerBlocks"

describe("AnswerBlocks", () => {
  it("uses a compact page-guide label and disclosure rows", () => {
    const html = renderToStaticMarkup(
      <AnswerBlocks
        blocks={[
          { title: "What this page lists", body: "Public products." },
          { title: "Who it is for", body: "Product researchers." },
        ]}
      />,
    )

    expect(html).toContain("Page guide")
    expect(html).not.toContain("Quick answers")
    expect(html.match(/<details/g)).toHaveLength(2)
    expect(html.match(/<article/g)).toHaveLength(2)
    expect(html).toContain("Tap to expand")
    expect(html).toContain('data-machine-readable-answers=""')
  })

  it("keeps a custom heading for editorial sections", () => {
    const html = renderToStaticMarkup(
      <AnswerBlocks
        heading="Shipyard, explained"
        blocks={[{ title: "What Shipyard is", body: "A launch platform." }]}
      />,
    )

    expect(html).toContain("Shipyard, explained")
  })
})
