import { beforeEach, describe, expect, it, vi } from "vitest"

const statusMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveUserByClerkId: vi.fn(),
  productFindFirst: vi.fn(),
  grantFindFirst: vi.fn(),
}))

vi.mock("@clerk/nextjs/server", () => ({ auth: statusMocks.auth }))
vi.mock("@/lib/server/userStatus", () => ({
  getActiveUserByClerkId: statusMocks.getActiveUserByClerkId,
}))
vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findFirst: statusMocks.productFindFirst },
    productPlanGrant: { findFirst: statusMocks.grantFindFirst },
  },
}))

import { GET } from "@/app/api/billing/plan-grants/status/route"

const PRODUCT_ID = "product_1"
const PLAN_ID = "plan_pro"

function request(query: string = `productId=${PRODUCT_ID}&planId=${PLAN_ID}`) {
  return new Request(
    `https://shipyardhq.dev/api/billing/plan-grants/status?${query}`,
  )
}

function expectPrivateNoStore(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  )
  expect(response.headers.get("vary")).toBe("Cookie")
}

describe("billing plan grant status route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    statusMocks.auth.mockResolvedValue({ userId: "clerk_1" })
    statusMocks.getActiveUserByClerkId.mockResolvedValue({ id: "user_1" })
    statusMocks.productFindFirst.mockResolvedValue({
      id: PRODUCT_ID,
      planId: PLAN_ID,
    })
    statusMocks.grantFindFirst.mockResolvedValue(null)
  })

  it("rejects unauthenticated requests without revealing billing state", async () => {
    statusMocks.auth.mockResolvedValueOnce({ userId: null })

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "unauthorized" })
    expectPrivateNoStore(response)
    expect(statusMocks.productFindFirst).not.toHaveBeenCalled()
  })

  it("rejects inactive member accounts", async () => {
    statusMocks.getActiveUserByClerkId.mockResolvedValueOnce(null)

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "inactive_account" })
    expectPrivateNoStore(response)
  })

  it("requires both product and expected plan correlation", async () => {
    const response = await GET(request(`productId=${PRODUCT_ID}`))

    expect(response.status).toBe(400)
    expectPrivateNoStore(response)
    expect(statusMocks.productFindFirst).not.toHaveBeenCalled()
  })

  it("returns the same not-found response for missing or foreign products", async () => {
    statusMocks.productFindFirst.mockResolvedValueOnce(null)

    const response = await GET(request())

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "product_not_found" })
    expectPrivateNoStore(response)
    expect(statusMocks.productFindFirst).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, userId: "user_1" },
      select: { id: true, planId: true },
    })
    expect(statusMocks.grantFindFirst).not.toHaveBeenCalled()
  })

  it("reports active only for an in-window Dodo grant on the expected plan", async () => {
    statusMocks.grantFindFirst.mockResolvedValueOnce({ id: "grant_1" })

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ state: "active" })
    expectPrivateNoStore(response)
    expect(statusMocks.grantFindFirst).toHaveBeenCalledWith({
      where: {
        productId: PRODUCT_ID,
        planId: PLAN_ID,
        source: { in: ["dodo_payment", "dodo_subscription"] },
        status: "active",
        startsAt: { lte: expect.any(Date) },
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    })
  })

  it("keeps missing, wrong-plan, future, expired, or terminal grants processing", async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ state: "processing" })
    expectPrivateNoStore(response)
  })

  it("waits until the expected plan is the product's effective projection", async () => {
    statusMocks.productFindFirst.mockResolvedValueOnce({
      id: PRODUCT_ID,
      planId: "plan_featured",
    })

    const response = await GET(request())

    expect(await response.json()).toEqual({ state: "processing" })
    expect(statusMocks.grantFindFirst).not.toHaveBeenCalled()
  })

  it("does not complete an unverified plan change from the old active subscription plan", async () => {
    // The database returns no row because the endpoint requires plan_pro;
    // an existing active plan_featured grant on the same subscription cannot
    // satisfy this exact-plan query.
    statusMocks.grantFindFirst.mockResolvedValueOnce(null)

    const response = await GET(request())

    expect(await response.json()).toEqual({ state: "processing" })
    expect(statusMocks.grantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ planId: PLAN_ID }),
      }),
    )
  })

  it("does not expose database errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    statusMocks.grantFindFirst.mockRejectedValueOnce(
      new Error("postgres credentials and internals"),
    )

    const response = await GET(request())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "status_unavailable" })
    expectPrivateNoStore(response)
    error.mockRestore()
  })
})
