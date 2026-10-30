import type { AcquisitionContext } from "@/lib/analytics/acquisition"
import { sendAttributedGaEvent } from "@/lib/server/analytics/attributedEvents"

type AuthEventInput = {
  method?: string | null
  userId?: string
  context?: AcquisitionContext
  eventKey?: string
}

// Provider webhooks do not contain browser context. Without an authenticated
// local account boundary and available IDs, attribution remains unknown.
export async function trackLoginInGa(input: AuthEventInput) {
  if (!input.userId || !input.eventKey) return
  return sendAttributedGaEvent({
    key: input.eventKey,
    userId: input.userId,
    name: "login",
    context: input.context,
    params: { method: safeMethod(input.method) },
  })
}

export async function trackSignupInGa(input: AuthEventInput) {
  if (!input.userId) return
  return sendAttributedGaEvent({
    key: `signup:${input.userId}`,
    userId: input.userId,
    name: "sign_up",
    context: input.context,
    params: { method: safeMethod(input.method) },
  })
}

function safeMethod(value?: string | null) {
  const method = value?.trim().toLowerCase()
  return method &&
    ["email", "google", "github", "apple", "microsoft", "account"].includes(
      method,
    )
    ? method
    : "account"
}
