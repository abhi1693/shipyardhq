import type { Instrumentation } from "next"

import { normalizeMetricRoute } from "@/lib/server/metrics/registry"

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const requestId = request.headers["x-request-id"]
  const cfRay = request.headers["cf-ray"]
  console.error(
    "[http] request error",
    JSON.stringify({
      requestId:
        typeof requestId === "string" &&
        /^[a-zA-Z0-9._-]{1,128}$/.test(requestId)
          ? requestId
          : undefined,
      cfRay:
        typeof cfRay === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(cfRay)
          ? cfRay
          : undefined,
      method: request.method,
      route: normalizeMetricRoute(request.path),
      routePath: context.routePath,
      routeType: context.routeType,
      errorName: error instanceof Error ? error.name : undefined,
      digest:
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof error.digest === "string"
          ? error.digest
          : undefined,
    }),
  )
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const [{ registerOpenTelemetry }, { registerProfiling }] =
      await Promise.all([
        import("@/lib/server/metrics/otel"),
        import("@/lib/server/metrics/profiling"),
      ])

    registerOpenTelemetry()
    await registerProfiling()
  }
}
