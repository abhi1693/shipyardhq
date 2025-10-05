import { describe, it, expect, beforeEach, vi } from "vitest"

import { GET } from "../route"
import { runBacklinkVerification } from "@/lib/server/rewards/backlinkVerification"

vi.mock("@/lib/server/rewards/backlinkVerification", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/rewards/backlinkVerification")
  >("@/lib/server/rewards/backlinkVerification")

  return {
    ...actual,
    runBacklinkVerification: vi.fn(),
  }
})

const mockedRunBacklinkVerification = vi.mocked(runBacklinkVerification)

describe("cron backlink verification route", () => {
  beforeEach(() => {
    mockedRunBacklinkVerification.mockReset()
    process.env.CRON_SECRET = "secret"
  })

  it("rejects unauthorized requests", async () => {
    const res = await GET(new Request("https://example.com"))
    expect(res.status).toBe(401)
  })

  it("runs backlink verification when authorized", async () => {
    mockedRunBacklinkVerification.mockResolvedValue({
      checked: 5,
      verified: 2,
      newlyVerified: 1,
      missing: 3,
      errors: 0,
      awarded: 1,
      failures: [],
    })

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.verified).toBe(2)
    expect(mockedRunBacklinkVerification).toHaveBeenCalled()
  })

  it("returns 500 on verifier failure", async () => {
    mockedRunBacklinkVerification.mockRejectedValueOnce(new Error("uh oh"))

    const res = await GET(
      new Request("https://example.com", {
        headers: { authorization: "Bearer secret" },
      }),
    )

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe("uh oh")
  })
})
