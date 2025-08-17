import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/dodo", () => {
  return {
    dodoClient: {
      customers: {
        customerPortal: {
          create: vi.fn(),
        },
      },
    },
  }
})

vi.mock("@/lib/fetchDodoCustomer", () => ({
  fetchDodoCustomerByEmail: vi.fn(),
}))

import {
  createDodoCustomerPortalLink,
  createDodoCustomerPortalLinkByEmail,
} from "@/lib/dodoCustomerPortal"
import { dodoClient } from "@/lib/dodo"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"

describe("dodo customer portal helpers", () => {
  beforeEach(() => {
    ;((dodoClient as any).customers.customerPortal.create as any).mockReset()
    ;(fetchDodoCustomerByEmail as any).mockReset()
  })

  it("creates portal link by customer id (send email)", async () => {
    ;(
      (dodoClient as any).customers.customerPortal.create as any
    ).mockResolvedValue({ link: "https://example/session" })
    const link = await createDodoCustomerPortalLink("cus_123", {
      sendEmail: true,
    })
    expect(link).toBe("https://example/session")
    expect(
      (dodoClient as any).customers.customerPortal.create,
    ).toHaveBeenCalledWith("cus_123", { send_email: true })
  })

  it("creates portal link by customer id (no email)", async () => {
    ;(
      (dodoClient as any).customers.customerPortal.create as any
    ).mockResolvedValue({ link: "https://example/session" })
    const link = await createDodoCustomerPortalLink("cus_123")
    expect(link).toBe("https://example/session")
    // default: no params
    expect(
      (dodoClient as any).customers.customerPortal.create,
    ).toHaveBeenCalledWith("cus_123", {})
  })

  it("returns null on API error", async () => {
    ;(
      (dodoClient as any).customers.customerPortal.create as any
    ).mockRejectedValue(new Error("boom"))
    const link = await createDodoCustomerPortalLink("cus_123")
    expect(link).toBeNull()
  })

  it("creates portal link by email when customer exists", async () => {
    ;(fetchDodoCustomerByEmail as any).mockResolvedValue({
      customer_id: "cus_999",
    })
    ;(
      (dodoClient as any).customers.customerPortal.create as any
    ).mockResolvedValue({ link: "https://example/byemail" })
    const link = await createDodoCustomerPortalLinkByEmail("a@example.com", {
      sendEmail: true,
    })
    expect(link).toBe("https://example/byemail")
    expect(fetchDodoCustomerByEmail).toHaveBeenCalledWith("a@example.com")
    expect(
      (dodoClient as any).customers.customerPortal.create,
    ).toHaveBeenCalledWith("cus_999", { send_email: true })
  })

  it("returns null by email when customer missing", async () => {
    ;(fetchDodoCustomerByEmail as any).mockResolvedValue(null)
    const link = await createDodoCustomerPortalLinkByEmail(
      "missing@example.com",
    )
    expect(link).toBeNull()
  })
})
