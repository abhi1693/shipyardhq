import { describe, expect, it } from "vitest"
import {
  acquisitionCheckoutMetadata,
  acquisitionEventParams,
  acquisitionFromCheckoutMetadata,
  acquisitionTouchFromLocation,
  normalizeAcquisitionContext,
  parseAcquisitionCookie,
  type AcquisitionContext,
} from "@/lib/analytics/acquisition"

const context: AcquisitionContext = {
  version: 1,
  firstTouch: {
    path: "/guides/product-launch-checklist",
    source: "google",
    medium: "organic",
    observedAt: 1,
  },
  conversionVisit: {
    path: "/pricing",
    source: "newsletter",
    medium: "email",
    observedAt: 2,
  },
  clientId: "12345.67890",
  sessionId: "1987654321",
  idsObservedAt: 1000,
}

describe("browser-to-conversion acquisition context", () => {
  it("carries the same available client/session IDs and distinct visits through checkout metadata", () => {
    const metadata = acquisitionCheckoutMetadata(context)
    expect(Object.values(metadata).every((value) => value.length <= 400)).toBe(
      true,
    )
    const returned = acquisitionFromCheckoutMetadata(metadata)!
    expect(returned).toEqual(context)
    expect(acquisitionEventParams(returned, 1001)).toMatchObject({
      session_id: Number(context.sessionId),
      first_source: "google",
      conversion_source: "newsletter",
      first_landing_path: context.firstTouch.path,
      conversion_landing_path: "/pricing",
    })
  })
  it("strips raw queries, emails, tokens and personal profile fields rather than forwarding metadata", () => {
    const touch = acquisitionTouchFromLocation(
      "/pricing",
      "?utm_source=alice@example.com&utm_medium=email&token=secret&email=alice@example.com",
      "https://google.com/search?q=private&token=secret",
      1,
    )!
    expect(touch).toEqual({
      path: "/pricing",
      medium: "email",
      referrerHost: "google.com",
      observedAt: 1,
    })
    const normalized = normalizeAcquisitionContext({
      ...context,
      email: "alice@example.com",
      token: "secret",
      firstTouch: {
        ...context.firstTouch,
        email: "alice@example.com",
        source: "sk_live_secret_token",
      },
    })!
    const data = JSON.stringify(normalized)
    expect(data).not.toContain("alice@example.com")
    expect(data).not.toContain("secret")
    expect(
      acquisitionTouchFromLocation("/auth/callback", "?code=secret", "", 1),
    ).toBeUndefined()
  })
  it("keeps missing IDs unknown and omits old sessions without inventing identities", () => {
    const withoutIds = normalizeAcquisitionContext({
      version: 1,
      firstTouch: context.firstTouch,
    })!
    expect(withoutIds.clientId).toBeUndefined()
    expect(
      acquisitionEventParams(context, 1000 + 25 * 3600 * 1000),
    ).not.toHaveProperty("session_id")
    expect(
      normalizeAcquisitionContext({
        ...context,
        clientId: "an-email@example.com",
        sessionId: "not-a-session",
      })?.clientId,
    ).toBeUndefined()
    expect(parseAcquisitionCookie("invalid")).toBeUndefined()
    expect(
      parseAcquisitionCookie(encodeURIComponent(JSON.stringify(context))),
    ).toEqual(context)
  })
})
