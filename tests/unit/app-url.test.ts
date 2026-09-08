import { describe, expect, it } from "vitest"

import { DEFAULT_APP_BASE_URL, resolveAppBaseUrl } from "@/lib/app-url"

describe("resolveAppBaseUrl", () => {
  it("returns only the configured public origin", () => {
    expect(
      resolveAppBaseUrl(
        "https://shipyardhq.dev/member/products?billing=success",
        "production",
      ),
    ).toBe("https://shipyardhq.dev")
  })

  it.each(["http://0.0.0.0:3000", "https://0.0.0.0:3000", "http://[::]:3000"])(
    "rejects bind address %s",
    (configuredUrl) => {
      expect(resolveAppBaseUrl(configuredUrl, "production")).toBe(
        DEFAULT_APP_BASE_URL,
      )
    },
  )

  it.each([
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://[::1]:3000",
    "http://shipyardhq.dev",
  ])("rejects non-public production origin %s", (configuredUrl) => {
    expect(resolveAppBaseUrl(configuredUrl, "production")).toBe(
      DEFAULT_APP_BASE_URL,
    )
  })

  it("allows a local HTTP origin outside production", () => {
    expect(resolveAppBaseUrl("http://localhost:3000/", "development")).toBe(
      "http://localhost:3000",
    )
  })

  it.each([undefined, "", "not a URL", "javascript:alert(1)"])(
    "falls back for missing or invalid configuration %s",
    (configuredUrl) => {
      expect(resolveAppBaseUrl(configuredUrl, "production")).toBe(
        DEFAULT_APP_BASE_URL,
      )
    },
  )
})
