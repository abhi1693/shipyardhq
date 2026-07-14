import { afterEach, describe, expect, it, vi } from "vitest"

import {
  isTransientCloudflareError,
  queryCloudflareHttpGroups,
} from "@/lib/server/analytics/cloudflareAnalytics"

describe("Cloudflare analytics API", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("queries raw zone HTTP traffic with date and optional path filters", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"))
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-tag")
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token")

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                {
                  groups: [
                    {
                      count: 12,
                      sum: { visits: 7 },
                      dimensions: {
                        clientRequestPath: "/products/example",
                      },
                    },
                  ],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      queryCloudflareHttpGroups({
        dateRange: { startDate: "2026-07-13", endDate: "2026-07-13" },
        dimensions: ["clientRequestPath"],
        pagePaths: ["/products/example"],
      }),
    ).resolves.toEqual([
      {
        count: 12,
        sum: { visits: 7 },
        dimensions: { clientRequestPath: "/products/example" },
      },
    ])

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.cloudflare.com/client/v4/graphql")
    expect(request.headers).toEqual({
      authorization: "Bearer api-token",
      "content-type": "application/json",
    })

    const payload = JSON.parse(String(request.body)) as {
      query: string
      variables: { zoneTag: string; filter: unknown }
    }
    expect(payload.query).toContain("httpRequestsAdaptiveGroups")
    expect(payload.query).toContain("dimensions { clientRequestPath }")
    expect(payload.variables).toEqual({
      zoneTag: "zone-tag",
      filter: {
        AND: [
          {
            datetime_geq: "2026-07-13T00:00:00.000Z",
            datetime_lt: "2026-07-14T00:00:00.000Z",
          },
          { OR: [{ clientRequestPath: "/products/example" }] },
        ],
      },
    })
  })

  it("does not filter site totals beyond the requested date window", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"))
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-tag")
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token")

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                { groups: [{ count: 130_580, sum: { visits: 63_080 } }] },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      queryCloudflareHttpGroups({
        dateRange: { startDate: "2026-07-13", endDate: "2026-07-13" },
      }),
    ).resolves.toEqual([{ count: 130_580, sum: { visits: 63_080 } }])

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(request.body)) as {
      variables: { filter: unknown }
    }
    expect(payload.variables.filter).toEqual({
      AND: [
        {
          datetime_geq: "2026-07-13T00:00:00.000Z",
          datetime_lt: "2026-07-14T00:00:00.000Z",
        },
      ],
    })
  })

  it("filters verified AI traffic by the requested bot categories", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"))
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-tag")
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token")

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { viewer: { zones: [{ groups: [] }] } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await queryCloudflareHttpGroups({
      dateRange: { startDate: "2026-07-13", endDate: "2026-07-13" },
      dimensions: ["verifiedBotCategory", "edgeResponseStatus"],
      verifiedBotCategories: ["AI Crawler", "AI Search", "AI Assistant"],
    })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(String(request.body)) as {
      query: string
      variables: { filter: unknown }
    }
    expect(payload.query).toContain(
      "dimensions { verifiedBotCategory edgeResponseStatus }",
    )
    expect(payload.variables.filter).toEqual({
      AND: [
        {
          datetime_geq: "2026-07-13T00:00:00.000Z",
          datetime_lt: "2026-07-14T00:00:00.000Z",
        },
        {
          verifiedBotCategory_in: ["AI Crawler", "AI Search", "AI Assistant"],
        },
      ],
    })
  })

  it("splits multi-day ranges and merges matching raw groups", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"))
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-tag")
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token")

    const response = (count: number, visits: number) =>
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                {
                  groups: [
                    {
                      count,
                      sum: { visits },
                      dimensions: { userAgentBrowser: "Chrome" },
                    },
                  ],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(10, 4))
      .mockResolvedValueOnce(response(20, 8))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      queryCloudflareHttpGroups({
        dateRange: { startDate: "2026-07-12", endDate: "2026-07-13" },
        dimensions: ["userAgentBrowser"],
      }),
    ).resolves.toEqual([
      {
        count: 30,
        sum: { visits: 12 },
        dimensions: { userAgentBrowser: "Chrome" },
      },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const filters = fetchMock.mock.calls.map(([, request]) => {
      const payload = JSON.parse(String((request as RequestInit).body)) as {
        variables: { filter: unknown }
      }
      return payload.variables.filter
    })
    expect(filters).toEqual([
      {
        AND: [
          {
            datetime_geq: "2026-07-12T00:00:00.000Z",
            datetime_lt: "2026-07-13T00:00:00.000Z",
          },
        ],
      },
      {
        AND: [
          {
            datetime_geq: "2026-07-13T00:00:00.000Z",
            datetime_lt: "2026-07-14T00:00:00.000Z",
          },
        ],
      },
    ])
  })

  it("treats aborted requests as transient", () => {
    expect(
      isTransientCloudflareError(
        new DOMException("The operation was aborted", "AbortError"),
      ),
    ).toBe(true)
  })
})
