import { describe, expect, it } from "vitest"

import {
  andGaDimensionFilters,
  buildGaHostnameExclusionFilter,
  buildPagePathFilter,
  normalizeGaHostname,
  resolveExcludedGaHostnames,
} from "@/lib/server/analytics/providers/ga/helpers"

describe("GA hostname filters", () => {
  it("normalizes local hostnames with ports and schemes", () => {
    expect(normalizeGaHostname("127.0.0.1:3002")).toBe("127.0.0.1")
    expect(normalizeGaHostname("http://localhost:3000/products/test")).toBe(
      "localhost",
    )
    expect(normalizeGaHostname("[::1]:3002")).toBe("::1")
    expect(normalizeGaHostname("HTTPS://Preview.Example.com/path")).toBe(
      "preview.example.com",
    )
  })

  it("keeps localhost excluded by default and accepts configured hosts", () => {
    expect(
      resolveExcludedGaHostnames("127.0.0.1:3002, staging.example.com"),
    ).toEqual(["localhost", "127.0.0.1", "::1", "staging.example.com"])
  })

  it("builds a GA hostName exclusion filter", () => {
    expect(buildGaHostnameExclusionFilter(["127.0.0.1:3002"])).toEqual({
      notExpression: {
        filter: {
          fieldName: "hostName",
          inListFilter: {
            values: ["127.0.0.1"],
            caseSensitive: false,
          },
        },
      },
    })
  })

  it("combines host exclusion with existing dimension filters", () => {
    const pagePathFilter = buildPagePathFilter(["/products/openclaw"])
    const hostFilter = buildGaHostnameExclusionFilter(["127.0.0.1:3002"])

    expect(andGaDimensionFilters(pagePathFilter, hostFilter)).toEqual({
      andGroup: {
        expressions: [pagePathFilter, hostFilter],
      },
    })
  })
})
