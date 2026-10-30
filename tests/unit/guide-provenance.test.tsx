import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { GuidePage } from "@/components/templates/public/guides/GuidePage"
import { GUIDES, type GuideDefinition } from "@/lib/guides/catalog"
import {
  buildGuideArticle,
  guideProvenanceMarkdown,
} from "@/lib/guides/provenance"

const fixture: GuideDefinition = {
  ...GUIDES[0],
  publishedAt: "2026-01-05",
  updatedAt: "2026-09-16",
  factCheckedAt: "2026-10-01",
  author: {
    type: "Person",
    name: "Fixture Author",
    url: "https://example.com/author",
  },
  reviewer: { type: "Person", name: "Fixture Reviewer" },
}

describe("guide provenance", () => {
  it("keeps publication, update, and fact-check dates distinct across HTML and Markdown", () => {
    const html = renderToStaticMarkup(<GuidePage guide={fixture} />)
    const markdown = guideProvenanceMarkdown(fixture).join("\n")
    const document = new DOMParser().parseFromString(html, "text/html")
    const dates = Array.from(document.querySelectorAll("time")).map((time) => [
      time.getAttribute("datetime"),
      time.textContent,
    ])
    expect(dates).toEqual([
      ["2026-01-05", "Published January 5, 2026"],
      ["2026-09-16", "Updated September 16, 2026"],
      ["2026-10-01", "Fact-checked October 1, 2026"],
    ])
    for (const date of [
      fixture.publishedAt,
      fixture.updatedAt,
      fixture.factCheckedAt,
    ])
      expect(markdown).toContain(date!)
    for (const name of ["Fixture Author", "Fixture Reviewer"]) {
      expect(html).toContain(name)
      expect(markdown).toContain(name)
    }
    const article = buildGuideArticle(fixture, "https://example.com/guide")
    expect(article.datePublished).toBe(fixture.publishedAt)
    expect(article.dateModified).toBe(fixture.updatedAt)
    expect(article.author.name).toBe("Fixture Author")
    expect(article.editor?.name).toBe("Fixture Reviewer")
    expect(html).toContain('"datePublished":"2026-01-05"')
    expect(html).toContain('"dateModified":"2026-09-16"')
  })

  it("does not invent publication dates or named reviewers for historical guides", () => {
    for (const guide of GUIDES) {
      const article = buildGuideArticle(guide, "https://example.com/guide")
      expect(article).not.toHaveProperty("datePublished")
      expect(article).not.toHaveProperty("editor")
      expect(article.author["@type"]).toBe("Organization")
      expect(guideProvenanceMarkdown(guide).join("\n")).not.toContain(
        "Published:",
      )
    }
  })

  it("renders the same supporting references in HTML, Article markup and Markdown", () => {
    for (const guide of GUIDES) {
      const html = renderToStaticMarkup(<GuidePage guide={guide} />)
      const markdown = guideProvenanceMarkdown(guide).join("\n")
      const article = buildGuideArticle(guide, "https://example.com/guide")
      expect(guide.sources.length).toBeGreaterThan(0)
      for (const source of guide.sources) {
        expect(html).toContain(`href="${source.url}"`)
        expect(markdown).toContain(`[${source.title}](${source.url})`)
        expect(article.citation).toContainEqual(
          expect.objectContaining({
            url: source.url,
            description: source.supports,
          }),
        )
      }
      expect(html).toContain("The short answer")
      expect(html).toContain("Frequently asked questions")
      expect(html).toContain("Submit your product")
    }
  })
})
