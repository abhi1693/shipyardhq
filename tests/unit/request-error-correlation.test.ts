// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

import { onRequestError } from "@/instrumentation"

describe("request error correlation", () => {
  it("correlates streamed render errors without logging private request data", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    onRequestError(
      Object.assign(new Error("sensitive database details"), {
        digest: "render-124",
      }),
      {
        path: "/member/products/private-product/upgrade?ticket=secret",
        method: "GET",
        headers: {
          "x-request-id": "request-124",
          "cf-ray": "ray-BLR",
          cookie: "secret-session",
          authorization: "Bearer secret-token",
        },
      },
      {
        routerKind: "App Router",
        routePath: "/member/products/[slug]/upgrade",
        routeType: "render",
        renderSource: "react-server-components",
        revalidateReason: undefined,
      },
    )
    expect(JSON.parse(log.mock.calls[0][1])).toEqual({
      requestId: "request-124",
      cfRay: "ray-BLR",
      method: "GET",
      route: "/member/products/:slug/upgrade",
      routePath: "/member/products/[slug]/upgrade",
      routeType: "render",
      errorName: "Error",
      digest: "render-124",
    })
  })
})
