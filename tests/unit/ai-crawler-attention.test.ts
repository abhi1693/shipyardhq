import { describe, expect, it } from "vitest"

import {
  buildAiCrawlerAttention,
  normalizeManagedLabels,
} from "@/lib/server/analytics/aiCrawlerAttention"

describe("AI crawler attention", () => {
  it("includes only verified AI categories and groups response outcomes", () => {
    const attention = buildAiCrawlerAttention({
      totalSiteRequests: 1_000,
      categories: [
        { category: "AI Crawler", requests: 120 },
        { category: "AI Search", requests: 30 },
        { category: "Search Engine Crawler", requests: 400 },
      ],
      statuses: [
        {
          category: "AI Crawler",
          crawlStatus: "paid",
          responseStatus: 200,
          requests: 100,
        },
        {
          category: "AI Crawler",
          crawlStatus: "not_applicable",
          responseStatus: 404,
          requests: 20,
        },
        {
          category: "AI Search",
          crawlStatus: "not_applicable",
          responseStatus: 301,
          requests: 30,
        },
        {
          category: "Search Engine Crawler",
          crawlStatus: "not_applicable",
          responseStatus: 200,
          requests: 400,
        },
      ],
      endpoints: [],
    })

    expect(attention.totalRequests).toBe(150)
    expect(attention.shareOfTraffic).toBe(15)
    expect(attention.successfulRequests).toBe(100)
    expect(attention.successRate).toBeCloseTo(66.67, 1)
    expect(attention.categories).toEqual([
      { category: "AI Crawler", requests: 120, share: 80 },
      { category: "AI Search", requests: 30, share: 20 },
    ])
    expect(
      attention.responseStatuses.map(({ key, label, requests }) => ({
        key,
        label,
        requests,
      })),
    ).toEqual([
      { key: "successful", label: "Successful (2xx)", requests: 100 },
      { key: "redirected", label: "Redirected (3xx)", requests: 30 },
      { key: "unavailable", label: "Unavailable (4xx)", requests: 20 },
    ])
    expect(attention.responseStatuses[0]?.share).toBeCloseTo(66.67, 1)
    expect(attention.responseStatuses[1]?.share).toBe(20)
    expect(attention.responseStatuses[2]?.share).toBeCloseTo(13.33, 1)
    expect(
      attention.crawlStatuses.map(({ status, requests }) => ({
        status,
        requests,
      })),
    ).toEqual([
      { status: "paid", requests: 100 },
      { status: "not_applicable", requests: 50 },
    ])
  })

  it("combines endpoint requests, matched endpoints, and managed labels", () => {
    const attention = buildAiCrawlerAttention({
      totalSiteRequests: 500,
      categories: [{ category: "AI Assistant", requests: 50 }],
      statuses: [],
      endpoints: [
        {
          category: "AI Assistant",
          endpoint: "/browse",
          matchedEndpoint: "/browse",
          managedLabels: ["cf-llm", "cf-log-in"],
          requests: 30,
        },
        {
          category: "AI Assistant",
          endpoint: "/browse",
          matchedEndpoint: "/browse/:category",
          managedLabels: ["cf-llm", "  "],
          requests: 20,
        },
      ],
    })

    expect(attention.endpoints).toEqual([
      {
        endpoint: "/browse",
        requests: 50,
        share: 100,
        matchedEndpoints: ["/browse", "/browse/:category"],
        managedLabels: ["cf-llm", "cf-log-in"],
      },
    ])
  })

  it("normalizes managed labels before storage", () => {
    expect(
      normalizeManagedLabels(["cf-llm", " cf-llm ", "", "cf-log-in"]),
    ).toEqual(["cf-llm", "cf-log-in"])
  })
})
