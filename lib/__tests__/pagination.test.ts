import { describe, expect, it } from "vitest"

import { resolvePagination } from "@/lib/pagination"

describe("resolvePagination", () => {
  it("uses defaults when parameters missing", () => {
    const result = resolvePagination(undefined)
    expect(result).toEqual({ page: 1, pageSize: 10, skip: 0, take: 10 })
  })

  it("coerces values from string arrays and enforces bounds", () => {
    const result = resolvePagination(
      {
        page: ["3"],
        limit: ["500"],
      },
      { maxPageSize: 100 },
    )

    expect(result).toEqual({ page: 3, pageSize: 100, skip: 200, take: 100 })
  })

  it("falls back when invalid numbers are provided", () => {
    const result = resolvePagination(
      {
        page: "-2",
        limit: "abc",
      },
      { defaultPage: 2, defaultPageSize: 25 },
    )

    expect(result).toEqual({ page: 1, pageSize: 25, skip: 0, take: 25 })
  })
})
