import { afterEach, describe, expect, it, vi } from "vitest"

import {
  isTransientCloudflareError,
  queryCloudflareHttpGroups,
  queryCloudflareHttpGroupsWithMetadata,
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

  it("retains each window's groups for high-cardinality ingestion", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"))
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-tag")
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token")

    const response = (date: string) =>
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                {
                  groups: [
                    {
                      count: 1,
                      sum: { visits: 0 },
                      dimensions: { date },
                    },
                  ],
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response("2026-07-11"))
        .mockResolvedValueOnce(response("2026-07-12"))
        .mockResolvedValueOnce(response("2026-07-13")),
    )

    await expect(
      queryCloudflareHttpGroupsWithMetadata({
        dateRange: { startDate: "2026-07-11", endDate: "2026-07-13" },
        dimensions: ["date"],
        limit: 2,
        limitScope: "per-window",
      }),
    ).resolves.toMatchObject({
      groups: [
        expect.objectContaining({ dimensions: { date: "2026-07-11" } }),
        expect.objectContaining({ dimensions: { date: "2026-07-12" } }),
        expect.objectContaining({ dimensions: { date: "2026-07-13" } }),
      ],
      truncated: false,
      windowsQueried: 3,
    })
  })

  it("splits capped high-cardinality windows until all groups fit", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"))
    vi.stubEnv("CLOUDFLARE_ZONE_ID", "zone-tag")
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token")

    const response = (groups: unknown[]) =>
      new Response(
        JSON.stringify({ data: { viewer: { zones: [{ groups }] } } }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    const group = (path: string) => ({
      count: 1,
      sum: { visits: 0 },
      dimensions: { clientRequestPath: path },
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([group("/capped-a"), group("/capped-b")]))
      .mockResolvedValueOnce(response([group("/first-half")]))
      .mockResolvedValueOnce(response([group("/second-half")]))
    const onWindowProgress = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      queryCloudflareHttpGroupsWithMetadata({
        dateRange: { startDate: "2026-07-13", endDate: "2026-07-13" },
        dimensions: ["clientRequestPath"],
        limit: 2,
        limitScope: "per-window",
        onWindowProgress,
        splitOnLimit: true,
      }),
    ).resolves.toEqual({
      groups: [group("/first-half"), group("/second-half")],
      truncated: false,
      windowsQueried: 3,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(onWindowProgress).toHaveBeenCalledTimes(3)
    expect(onWindowProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "split",
        groups: 2,
        limit: 2,
        windowStart: "2026-07-13T00:00:00.000Z",
        windowEnd: "2026-07-14T00:00:00.000Z",
        windowsQueried: 1,
      }),
    )
    expect(onWindowProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "completed",
        groups: 1,
        limit: 2,
        windowStart: "2026-07-13T00:00:00.000Z",
        windowEnd: "2026-07-13T12:00:00.000Z",
        windowsQueried: 2,
      }),
    )
    expect(onWindowProgress).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        action: "completed",
        groups: 1,
        limit: 2,
        windowStart: "2026-07-13T12:00:00.000Z",
        windowEnd: "2026-07-14T00:00:00.000Z",
        windowsQueried: 3,
      }),
    )
    const filters = fetchMock.mock.calls.map(([, request]) => {
      const payload = JSON.parse(String((request as RequestInit).body)) as {
        variables: { filter: { AND: Array<Record<string, string>> } }
      }
      return payload.variables.filter.AND[0]
    })
    expect(filters).toEqual([
      {
        datetime_geq: "2026-07-13T00:00:00.000Z",
        datetime_lt: "2026-07-14T00:00:00.000Z",
      },
      {
        datetime_geq: "2026-07-13T00:00:00.000Z",
        datetime_lt: "2026-07-13T12:00:00.000Z",
      },
      {
        datetime_geq: "2026-07-13T12:00:00.000Z",
        datetime_lt: "2026-07-14T00:00:00.000Z",
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
