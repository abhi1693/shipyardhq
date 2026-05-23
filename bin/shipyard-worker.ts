#!/usr/bin/env tsx

async function main() {
  process.env.SHIPYARD_DISABLE_STARTUP_JOBS ||= "1"

  const { startShipyardWorker } = await import("@/lib/server/jobs/worker")
  const worker = await startShipyardWorker()
  let closing = false

  const close = async (signal: NodeJS.Signals) => {
    if (closing) return
    closing = true
    console.info("[worker] shutdown requested", { signal })

    try {
      await worker.close()
      console.info("[worker] shutdown complete")
      process.exit(0)
    } catch (error) {
      console.error("[worker] shutdown failed", error)
      process.exit(1)
    }
  }

  process.once("SIGINT", close)
  process.once("SIGTERM", close)
}

main().catch((error) => {
  console.error("[worker] startup failed", error)
  process.exit(1)
})
