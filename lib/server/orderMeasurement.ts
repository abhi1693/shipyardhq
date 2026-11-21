import { createHash } from "node:crypto"

export function orderMeasurementId(paymentId: string) {
  return createHash("sha256")
    .update("shipyard:dodo:order:" + paymentId)
    .digest("hex")
}

export function subscriptionMeasurementId(subscriptionId: string) {
  return createHash("sha256")
    .update("shipyard:dodo:subscription:" + subscriptionId)
    .digest("hex")
}
