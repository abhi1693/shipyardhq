import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { resolveRedirectUrl, sanitizeRedirectUrl } from "@/lib/auth/redirect"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.shipyardhq.com"
})

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
})

describe("sanitizeRedirectUrl", () => {
  it("returns relative paths untouched", () => {
    expect(
      sanitizeRedirectUrl(MEMBER_PRODUCTS_PATH, "app.shipyardhq.com"),
    ).toBe(MEMBER_PRODUCTS_PATH)
  })

  it("allows absolute URLs matching configured or request host", () => {
    const url = sanitizeRedirectUrl(
      `https://app.shipyardhq.com${MEMBER_PRODUCTS_PATH}`,
      null,
    )
    expect(url).toBe(MEMBER_PRODUCTS_PATH)
  })

  it("rejects URLs with non-http protocols", () => {
    expect(
      sanitizeRedirectUrl("javascript:alert(1)", "app.shipyardhq.com"),
    ).toBe(undefined)
  })

  it("rejects URLs pointing to disallowed hosts", () => {
    const result = sanitizeRedirectUrl(
      "https://phishing.example.com",
      "app.shipyardhq.com",
    )
    expect(result).toBeUndefined()
  })
})

describe("resolveRedirectUrl", () => {
  it("prefers redirect_url parameter over redirectUrl", () => {
    const result = resolveRedirectUrl(
      {
        redirectUrl: "/fallback",
        redirect_url: "https://app.shipyardhq.com/primary",
      },
      "app.shipyardhq.com",
    )

    expect(result).toBe("/primary")
  })

  it("returns undefined when no valid redirect is found", () => {
    const result = resolveRedirectUrl(
      {
        redirectUrl: "https://malicious.example.com",
      },
      "app.shipyardhq.com",
    )

    expect(result).toBeUndefined()
  })
})
