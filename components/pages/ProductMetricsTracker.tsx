"use client"

import { useEffect } from "react"

interface ProductMetricsTrackerProps {
  productId: string
}

function postWithFetch(endpoint: string, payload: Record<string, unknown>) {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  })
}

export default function ProductMetricsTracker({
  productId,
}: ProductMetricsTrackerProps) {
  useEffect(() => {
    if (!productId) return

    const endpoint = "/api/analytics/ingest"
    const payload = {
      productId,
      path: window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
    }

    const encoded = JSON.stringify(payload)
    const blob = new Blob([encoded], { type: "application/json" })

    if (navigator.sendBeacon) {
      const queued = navigator.sendBeacon(endpoint, blob)
      if (!queued) {
        postWithFetch(endpoint, payload).catch(() => null)
      }
    } else {
      postWithFetch(endpoint, payload).catch(() => null)
    }
  }, [productId])

  return null
}
