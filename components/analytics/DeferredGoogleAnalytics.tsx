"use client"

import { useEffect } from "react"

type GtagCommand = [string, ...unknown[]]
type Gtag = (...args: GtagCommand) => void

interface AnalyticsWindow extends Window {
  dataLayer?: IArguments[]
  gtag?: Gtag
}

function loadGoogleAnalytics(gaId: string) {
  const disabledKey = `ga-disable-${gaId}`
  const analyticsWindow = window as AnalyticsWindow
  const analyticsFlags = window as unknown as Record<string, unknown>

  if (analyticsFlags[disabledKey]) return
  if (document.querySelector(`script[data-shipyard-ga="${gaId}"]`)) return

  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? []
  analyticsWindow.gtag =
    analyticsWindow.gtag ??
    function gtag() {
      // gtag.js expects queued commands to match the standard snippet shape.
      // eslint-disable-next-line prefer-rest-params
      analyticsWindow.dataLayer?.push(arguments)
    }

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    gaId,
  )}`
  script.dataset.shipyardGa = gaId
  document.head.appendChild(script)

  analyticsWindow.gtag("js", new Date())
  analyticsWindow.gtag("config", gaId)
}

export function DeferredGoogleAnalytics({ gaId }: { gaId: string }) {
  useEffect(() => {
    if (document.readyState === "complete") {
      loadGoogleAnalytics(gaId)
      return undefined
    }

    const handleLoad = () => {
      loadGoogleAnalytics(gaId)
    }

    window.addEventListener("load", handleLoad, { once: true })

    return () => {
      window.removeEventListener("load", handleLoad)
    }
  }, [gaId])

  return null
}
