import { afterEach, describe, expect, it } from "vitest"
import { captureBrowserAcquisition } from "@/components/analytics/browserAcquisition"
import {
  ACQUISITION_COOKIE,
  acquisitionFromCheckoutMetadata,
  acquisitionCheckoutMetadata,
  parseAcquisitionCookie,
} from "@/lib/analytics/acquisition"

function context() {
  return parseAcquisitionCookie(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${ACQUISITION_COOKIE}=`))
      ?.slice(ACQUISITION_COOKIE.length + 1),
  )!
}
function tag(sessionId: string) {
  return (
    _command: string,
    _id: unknown,
    field: unknown,
    callback: unknown,
  ) => {
    ;(callback as (value: string) => void)(
      field === "client_id" ? "12345.67890" : sessionId,
    )
  }
}
afterEach(() => {
  document.cookie = `${ACQUISITION_COOKIE}=; Path=/; Max-Age=0`
  sessionStorage.clear()
  history.replaceState(null, "", "/")
})

describe("browser acquisition capture", () => {
  it("retains first-touch search attribution while recording a later conversion visit", () => {
    history.replaceState(
      null,
      "",
      "/guides/product-launch-checklist?utm_source=google&utm_medium=organic",
    )
    captureBrowserAcquisition("G-TEST", tag("123"))
    expect(context()).toMatchObject({
      clientId: "12345.67890",
      sessionId: "123",
      firstTouch: { source: "google" },
      conversionVisit: { source: "google" },
    })
    history.replaceState(
      null,
      "",
      "/pricing?utm_source=newsletter&utm_medium=email",
    )
    captureBrowserAcquisition("G-TEST", tag("456"))
    const snapshot = context()
    expect(snapshot).toMatchObject({
      firstTouch: {
        source: "google",
        path: "/guides/product-launch-checklist",
      },
      conversionVisit: { source: "newsletter", path: "/pricing" },
      clientId: "12345.67890",
      sessionId: "456",
    })
    expect(
      acquisitionFromCheckoutMetadata(acquisitionCheckoutMetadata(snapshot)),
    ).toEqual(snapshot)
  })
  it("carries available context through auth without retaining callback credentials", () => {
    history.replaceState(null, "", "/pricing?utm_source=google")
    captureBrowserAcquisition("G-TEST", tag("123"))
    history.replaceState(
      null,
      "",
      "/auth/callback?code=private-code&email=private@example.com",
    )
    captureBrowserAcquisition("G-TEST", tag("123"))
    expect(context().clientId).toBe("12345.67890")
    expect(JSON.stringify(context())).not.toMatch(
      /private-code|private@example|callback/,
    )
  })
  it("leaves client/session IDs unknown when the browser tag has not supplied them", () => {
    captureBrowserAcquisition("G-TEST", () => {})
    expect(context().clientId).toBeUndefined()
    expect(context().sessionId).toBeUndefined()
  })
})
