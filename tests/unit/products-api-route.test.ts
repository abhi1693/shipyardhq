// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  default: { product: { findMany } },
}))

import { GET } from "@/app/api/products/route"

const TOKEN = "test-products-token"
const PLAN_ID = "shipyard-pro-plan"
const BASE_URL = "https://shipyardhq.dev"

function request(query = "", authorization: string | null = `Bearer ${TOKEN}`) {
  return new Request(`${BASE_URL}/api/products${query}`, {
    headers: authorization ? { Authorization: authorization } : {},
  })
}

function product(id: string, createdAt = "2026-10-01T12:00:00.000Z") {
  return {
    id,
    slug: `example-${id}`,
    name: `Example ${id}`,
    tagline: "An example product",
    description: "Full product description",
    websiteUrl: "https://example.com/pricing",
    logo: "https://media.shipyardhq.dev/example.webp",
    pricingModel: "subscription",
    startingPriceCents: 1200,
    currencyCode: "USD",
    createdAt: new Date(createdAt),
    plan: { id: PLAN_ID, slug: "pro", name: "Pro" },
  }
}

function encodeCursor(overrides: Record<string, unknown> = {}) {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      planId: PLAN_ID,
      createdAt: "2026-10-01T12:00:00.000Z",
      id: "p2",
      ...overrides,
    }),
  ).toString("base64url")
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  )
  expect(response.headers.get("vary")).toBe("Authorization")
}

describe("products API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("PRODUCTS_API_TOKEN", TOKEN)
    vi.stubEnv("PRODUCTS_API_PLAN_ID", PLAN_ID)
    vi.stubEnv("NEXT_PUBLIC_APP_URL", BASE_URL)
    findMany.mockResolvedValue([])
  })

  afterEach(() => vi.unstubAllEnvs())

  it.each(["PRODUCTS_API_TOKEN", "PRODUCTS_API_PLAN_ID"])(
    "fails closed when %s is missing or blank",
    async (name) => {
      for (const value of [undefined, "", "   "]) {
        vi.stubEnv(name, value)
        const response = await GET(request())
        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({
          error: "products_api_unavailable",
        })
        expectPrivate(response)
      }
      expect(findMany).not.toHaveBeenCalled()
    },
  )

  it.each([
    null,
    "Bearer wrong",
    `Basic ${TOKEN}`,
    TOKEN,
    "Bearer",
    `Bearer ${TOKEN} extra`,
    `Bearer ${TOKEN}${"x".repeat(100)}`,
  ])("rejects invalid authentication (%s) before querying", async (header) => {
    const response = await GET(request("?limit=bad", header))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "unauthorized" })
    expect(response.headers.get("www-authenticate")).toBe("Bearer")
    expectPrivate(response)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("accepts a case-insensitive bearer scheme", async () => {
    const response = await GET(request("", `bearer ${TOKEN}`))
    expect(response.status).toBe(200)
  })

  it("returns only published products for the configured Shipyard plan", async () => {
    findMany.mockResolvedValue([product("p1")])

    const response = await GET(request("?planId=other-plan"))

    expect(response.status).toBe(200)
    expectPrivate(response)
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "published", planId: PLAN_ID },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
      select: expect.objectContaining({
        id: true,
        slug: true,
        description: true,
        websiteUrl: true,
        plan: { select: { id: true, slug: true, name: true } },
      }),
    })
    expect(await response.json()).toEqual({
      items: [
        {
          id: "p1",
          slug: "example-p1",
          name: "Example p1",
          url: `${BASE_URL}/products/example-p1`,
          productUrl: "https://example.com/pricing",
          tagline: "An example product",
          description: "Full product description",
          logo: "https://media.shipyardhq.dev/example.webp",
          pricing: {
            model: "subscription",
            startingPriceCents: 1200,
            currencyCode: "USD",
          },
          plan: { id: PLAN_ID, slug: "pro", name: "Pro" },
        },
      ],
      limit: 20,
      hasMore: false,
      nextCursor: null,
    })
    const select = findMany.mock.calls[0][0].select
    for (const field of ["userId", "subscriptionId", "planGrants"]) {
      expect(select).not.toHaveProperty(field)
    }
  })

  it("returns an empty page with no continuation when nothing matches", async () => {
    const response = await GET(request())
    expect(await response.json()).toEqual({
      items: [],
      limit: 20,
      hasMore: false,
      nextCursor: null,
    })
  })

  it("keeps absent product pricing values null", async () => {
    findMany.mockResolvedValue([
      {
        ...product("free"),
        pricingModel: "free",
        startingPriceCents: null,
        currencyCode: null,
      },
    ])
    const response = await GET(request())
    expect((await response.json()).items[0].pricing).toEqual({
      model: "free",
      startingPriceCents: null,
      currencyCode: null,
    })
  })

  it("paginates tied timestamps using the last returned row, without exposing the lookahead", async () => {
    findMany.mockResolvedValueOnce([
      product("p3"),
      product("p2"),
      product("p1"),
    ])
    const response = await GET(request("?limit=2"))
    const firstPage = await response.json()
    expect(firstPage.items.map((item: { id: string }) => item.id)).toEqual([
      "p3",
      "p2",
    ])
    expect(firstPage.hasMore).toBe(true)
    expect(
      JSON.parse(Buffer.from(firstPage.nextCursor, "base64url").toString()),
    ).toEqual({
      version: 1,
      planId: PLAN_ID,
      createdAt: "2026-10-01T12:00:00.000Z",
      id: "p2",
    })
    expect(firstPage).not.toHaveProperty("nextUrl")

    findMany.mockResolvedValueOnce([product("p1")])
    const nextResponse = await GET(
      request(`?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`),
    )
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          planId: PLAN_ID,
          OR: [
            { createdAt: { lt: new Date("2026-10-01T12:00:00.000Z") } },
            {
              createdAt: new Date("2026-10-01T12:00:00.000Z"),
              id: { lt: "p2" },
            },
          ],
        },
        take: 3,
      }),
    )
    const lastPage = await nextResponse.json()
    expect(lastPage.items.map((item: { id: string }) => item.id)).toEqual([
      "p1",
    ])
    expect(lastPage.hasMore).toBe(false)
    expect(lastPage.nextCursor).toBeNull()
    expect(lastPage).not.toHaveProperty("nextUrl")
  })

  it("builds listing URLs from the configured origin without copying request secrets", async () => {
    findMany.mockResolvedValueOnce([product("p2"), product("p1")])
    const response = await GET(
      new Request(
        "https://untrusted.example/api/products?limit=1&token=secret",
        {
          headers: { Authorization: `Bearer ${TOKEN}` },
        },
      ),
    )
    const page = await response.json()
    expect(page).not.toHaveProperty("nextUrl")
    expect(page.items[0].url).toBe(`${BASE_URL}/products/example-p2`)
  })

  it.each([
    "0",
    "101",
    "-1",
    "1.5",
    "1e1",
    "abc",
    "",
    "01",
    "Infinity",
    "2&limit=3",
  ])("rejects invalid or duplicate limits (%s)", async (limit) => {
    const response = await GET(request(`?limit=${limit}`))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "invalid_pagination" })
    expectPrivate(response)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("accepts the maximum page size", async () => {
    const response = await GET(request("?limit=100"))
    expect(response.status).toBe(200)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 101 }),
    )
  })

  it.each([
    "",
    "%",
    "a".repeat(2049),
    Buffer.from("not json").toString("base64url"),
    encodeCursor({ version: 2 }),
    encodeCursor({ planId: "other-plan" }),
    encodeCursor({ createdAt: "not a date" }),
    encodeCursor({ id: "" }),
    encodeCursor({ id: 123 }),
    `${encodeCursor()}&cursor=${encodeCursor()}`,
  ])(
    "rejects malformed, incompatible, or duplicate cursors (%#)",
    async (cursor) => {
      const response = await GET(request(`?cursor=${cursor}`))
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: "invalid_pagination" })
      expectPrivate(response)
      expect(findMany).not.toHaveBeenCalled()
    },
  )

  it("returns a generic error when the database fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    findMany.mockRejectedValueOnce(new Error("private database details"))
    const response = await GET(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "products_unavailable" })
    expectPrivate(response)
    expect(log).toHaveBeenCalledWith("[products-api] Failed to list products")
  })
})
