import { randomUUID } from "crypto"

import { IS_PROD } from "@/lib/constants"

const MEASUREMENT_ID = process.env.GOOGLE_ANALYTICS_ID?.trim()
const API_SECRET = process.env.GOOGLE_ANALYTICS_API_SECRET?.trim()
const GA_ENDPOINT = IS_PROD
  ? "https://www.google-analytics.com/mp/collect"
  : "https://www.google-analytics.com/debug/mp/collect"

const hasGaConfig = () => Boolean(MEASUREMENT_ID && API_SECRET)

type TrackLoginInput = {
  method?: string | null
}

export async function trackLoginInGa(input: TrackLoginInput) {
  if (!hasGaConfig()) return
  const trimmedMethod = input.method?.trim()
  if (!trimmedMethod) return

  const measurementId = MEASUREMENT_ID!
  const apiSecret = API_SECRET!

  const body = {
    client_id: randomUUID(),
    events: [
      {
        name: "login",
        params: { method: trimmedMethod },
      },
    ],
  }

  console.info(
    "[analytics] GA login request body",
    JSON.stringify(body, null, 2),
  )

  try {
    const response = await fetch(
      `${GA_ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("[analytics] failed to record GA login", {
        status: response.status,
        body: errorText?.slice?.(0, 256),
      })
    }
  } catch (error) {
    console.error("[analytics] GA login request threw", error)
  }
}
