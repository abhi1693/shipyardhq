import { describe, expect, it } from "vitest"

import { buildUseCaseCategoryMatrixCopy } from "@/lib/pseo/matrix-copy"

describe("pSEO matrix copy", () => {
  it("uses user-facing copy for use-case category pages", () => {
    const copy = buildUseCaseCategoryMatrixCopy({
      useCaseLabel: "Build internal tools",
      categoryName: "Developer Tools",
      total: 7,
    })

    expect(copy.title).toBe("Best developer tools for building internal tools")
    expect(copy.description).toContain("7 products")
    expect(copy.description).toContain("teams building internal tools")
    expect(copy.description).toContain("Compare new launches")
    expect(copy.description).not.toMatch(/canonical|metadata|mapped|slice/i)
  })
})
