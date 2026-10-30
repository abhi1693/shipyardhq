import {
  acquisitionEventParams,
  type AcquisitionContext,
} from "@/lib/analytics/acquisition"

// Synthetic identifiers and the non-recording endpoint deliberately avoid
// creating conversions in a production property. This validates contents only.
const context: AcquisitionContext = {
  version: 1,
  firstTouch: {
    path: "/guides/product-launch-checklist",
    source: "google",
    medium: "organic",
    observedAt: Date.now(),
  },
  conversionVisit: {
    path: "/pricing",
    source: "newsletter",
    medium: "email",
    observedAt: Date.now(),
  },
  clientId: "123456789.987654321",
  sessionId: String(Math.floor(Date.now() / 1000)),
  idsObservedAt: Date.now(),
}
const payload = {
  client_id: context.clientId,
  validation_behavior: "ENFORCE_RECOMMENDATIONS",
  events: [
    {
      name: "sign_up",
      params: {
        method: "account",
        ...acquisitionEventParams(context),
        event_id: "signup-validation-fixture",
      },
    },
    {
      name: "purchase",
      params: {
        transaction_id: "validation-fixture",
        value: 10,
        currency: "USD",
        ...acquisitionEventParams(context),
        event_id: "purchase-validation-fixture",
      },
    },
  ],
}

async function main() {
  const response = await fetch(
    "https://www.google-analytics.com/debug/mp/collect?measurement_id=G-VALIDATION&api_secret=validation-only",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    },
  )
  const result = (await response.json()) as { validationMessages?: unknown[] }
  const accepted =
    response.ok &&
    Array.isArray(result.validationMessages) &&
    result.validationMessages.length === 0
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        endpoint: "Google Measurement Protocol debug (does not record events)",
        syntheticContext: true,
        accepted,
        validationMessages: result.validationMessages,
        eventNames: payload.events.map((event) => event.name),
      },
      null,
      2,
    ),
  )
  if (!accepted) process.exitCode = 1
}
main().catch(() => {
  console.error("Debug validation failed; no conversion acceptance is claimed.")
  process.exitCode = 1
})
