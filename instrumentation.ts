export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { registerOpenTelemetry } = await import("@/lib/server/metrics/otel")
    registerOpenTelemetry()
  }
}
