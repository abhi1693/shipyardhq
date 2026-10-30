import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import {
  parseDirectoryPage,
  directoryPagePath,
  hasDirectoryFilters,
} from "@/lib/directory/pagination"
import { hasSeoQueryNoindexParams } from "@/lib/proxy-routing"
import { DirectoryPagination } from "@/components/molecules/DirectoryPagination"

describe("persistent directory pagination", () => {
  it("rejects malformed, duplicate and unsafe pages", () => {
    for (const value of [
      "0",
      "-1",
      "2.5",
      "02",
      "Infinity",
      "100001",
      ["2", "3"],
    ])
      expect(parseDirectoryPage(value)).toBeNull()
    expect(parseDirectoryPage(undefined)).toBe(1)
    expect(parseDirectoryPage("2")).toBe(2)
  })
  it("links adjacent pages in server HTML and preserves filters", () => {
    const html = renderToStaticMarkup(
      <DirectoryPagination
        path="/browse"
        page={2}
        hasMore
        params={{ q: "email tools", page: "2" }}
      />,
    )
    expect(html).toContain('href="/browse?q=email+tools" rel="prev"')
    expect(html).toContain('href="/browse?q=email+tools&amp;page=3" rel="next"')
    expect(directoryPagePath("/categories/ai", 1)).toBe("/categories/ai")
    expect(hasDirectoryFilters({ page: "2" })).toBe(false)
    expect(hasDirectoryFilters({ page: "2", sort: "votes" })).toBe(true)
  })
  it("allows valid page URLs only on supported directories, retaining filter and Markdown controls", () => {
    for (const path of ["/browse", "/categories/ai"]) {
      expect(
        hasSeoQueryNoindexParams(new URLSearchParams("page=2"), path),
      ).toBe(false)
      for (const query of [
        "page=0",
        "page=2&page=3",
        "page=2&q=email",
        "page=2&sort=votes",
      ])
        expect(hasSeoQueryNoindexParams(new URLSearchParams(query), path)).toBe(
          true,
        )
    }
    expect(
      hasSeoQueryNoindexParams(
        new URLSearchParams("page=2"),
        "/alternatives/tool",
      ),
    ).toBe(true)
    expect(
      hasSeoQueryNoindexParams(new URLSearchParams("page=2"), "/browse.md"),
    ).toBe(true)
  })
})
