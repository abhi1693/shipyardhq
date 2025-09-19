import { describe, expect, it, vi } from "vitest"

import {
  hashIpAddress,
  inferDeviceCategory,
  parseBrowser,
  parseOs,
  sanitizePath,
  sanitizeReferrer,
} from "@/lib/server/analytics/clientMetadata"

vi.stubEnv("ANALYTICS_HASH_SALT", "test")

describe("clientMetadata helpers", () => {
  it("detects device from mobile hint", () => {
    expect(inferDeviceCategory(undefined, "?1")).toEqual("mobile")
    expect(
      inferDeviceCategory(
        "Mozilla/5.0 (iPad; CPU OS 13_2) AppleWebKit/605.1.15",
        null,
      ),
    ).toEqual("tablet")
    expect(inferDeviceCategory("Mozilla/5.0 (Windows NT 10.0)", null)).toEqual(
      "desktop",
    )
  })

  it("parses browser from sec-ch-ua brand hints", () => {
    expect(
      parseBrowser(
        "",
        '"Chromium";v="130", "Google Chrome";v="130", "Not:A-Brand";v="99"',
      ),
    ).toEqual("Chromium")
    expect(parseBrowser("Mozilla/5.0 (Macintosh) Firefox/115.0", null)).toEqual(
      "Firefox",
    )
  })

  it("parses os from hints and ua", () => {
    expect(parseOs("", '"Android"')).toEqual("Android")
    expect(
      parseOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", null),
    ).toEqual("macOS")
  })

  it("hashes IP addresses with provided salt", () => {
    const hash = hashIpAddress("127.0.0.1")
    expect(hash).toBeTruthy()
    expect(hash).toHaveLength(64)
  })

  it("sanitizes long strings", () => {
    const long = "x".repeat(2000)
    expect(sanitizePath(long)?.length).toBeLessThanOrEqual(1024)
    expect(sanitizeReferrer(long)?.length).toBeLessThanOrEqual(1024)
  })
})
