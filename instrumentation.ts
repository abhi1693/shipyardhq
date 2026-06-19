import type { Instrumentation } from "next"

const OTEL_TRACE_EXPORTER_ENV_KEYS = [
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
] as const

function hasEnvValue(key: string) {
  return Boolean(process.env[key]?.trim())
}

function assertRequiredOtelEnv() {
  const missing: string[] = []

  if (!hasEnvValue("OTEL_SERVICE_NAME")) {
    missing.push("OTEL_SERVICE_NAME")
  }

  if (!OTEL_TRACE_EXPORTER_ENV_KEYS.some(hasEnvValue)) {
    missing.push(OTEL_TRACE_EXPORTER_ENV_KEYS.join(" or "))
  }

  if (missing.length) {
    throw new Error(
      `[otel] Missing required OpenTelemetry env var(s): ${missing.join(", ")}`,
    )
  }
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const digest =
      typeof (error as Error & { digest?: unknown }).digest === "string"
        ? (error as Error & { digest: string }).digest
        : undefined

    return {
      message: error.message,
      digest,
      name: error.name,
    }
  }

  return {
    message: String(error),
    digest: undefined,
    name: "UnknownError",
  }
}

export async function register() {
  assertRequiredOtelEnv()

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node")
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const errorDetails = getErrorDetails(error)

  console.error("[request-error]", {
    ...errorDetails,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  })
}
