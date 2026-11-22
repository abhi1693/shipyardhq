const consentKey = "shipyard.openai-ads-consent"
export const consentChanged = "shipyard:openai-ads-consent"
export const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim()

type PixelCall =
  | ["consent", boolean]
  | ["init", { pixelId: string }]
  | [
      "measure",
      "subscription_created",
      { type: "plan_enrollment" },
      { event_id: string },
    ]
  | ["measure", "order_created", { type: "contents" }, { event_id: string }]
  | ["measure", "checkout_started", { type: "contents" }]
  | ["measure", "registration_completed", { type: "customer_action" }]
  | ["measure", "page_viewed", { type: "contents" }]

declare global {
  interface Window {
    oaiq?: ((...args: PixelCall) => void) & { q?: PixelCall[] }
  }
}

export function hasPixelConsent() {
  try {
    const preference = localStorage.getItem(consentKey)
    return preference === null || preference === "granted"
  } catch {
    return false
  }
}

export function setPixelConsent(granted: boolean) {
  localStorage.setItem(consentKey, granted ? "granted" : "denied")
  syncPixelConsent()
  window.dispatchEvent(new Event(consentChanged))
}

export function syncPixelConsent() {
  if (!pixelId) return
  const granted = hasPixelConsent()
  if (window.oaiq) {
    window.oaiq("consent", granted)
    return
  }
  if (!granted) return

  const queue: PixelCall[] = []
  window.oaiq = Object.assign(
    (...args: PixelCall) => {
      queue.push(args)
    },
    { q: queue },
  )
  window.oaiq("consent", true)
  window.oaiq("init", { pixelId })
  const script = document.createElement("script")
  script.async = true
  script.src = "https://bzrcdn.openai.com/sdk/oaiq.min.js"
  script.onerror = () => {
    if (window.oaiq?.q === queue) delete window.oaiq
    script.remove()
  }
  document.head.appendChild(script)
}

export function measureRegistration() {
  if (pixelId && hasPixelConsent())
    window.oaiq?.("measure", "registration_completed", {
      type: "customer_action",
    })
}

export function measureOrder(eventId: string) {
  if (!pixelId || !hasPixelConsent()) return
  try {
    window.oaiq?.(
      "measure",
      "order_created",
      { type: "contents" },
      { event_id: eventId },
    )
  } catch {
    // Pixel failures must not interrupt billing confirmation.
  }
}

export function measureSubscription(eventId: string) {
  if (!pixelId || !hasPixelConsent()) return
  try {
    window.oaiq?.(
      "measure",
      "subscription_created",
      { type: "plan_enrollment" },
      { event_id: eventId },
    )
  } catch {
    // Measurement must not interrupt the customer's billing confirmation.
  }
}
