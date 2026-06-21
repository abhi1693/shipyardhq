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
