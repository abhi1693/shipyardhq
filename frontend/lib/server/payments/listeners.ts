import { registerEventHandler } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { syncPaymentConnector } from "./connectors"

registerEventHandler({
  event: APP_EVENTS.PAYMENTS_CONNECTOR_SYNC,
  id: "payments.connector.sync",
  queue: "low",
  handler: async ({ connectorId }) => {
    try {
      await syncPaymentConnector(connectorId)
    } catch (error) {
      console.error("[payments:sync] connector sync failed", {
        connectorId,
        error,
      })
    }
  },
})

export {}
