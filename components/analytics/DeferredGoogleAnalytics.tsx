"use client"

import { useEffect } from "react"

type DataLayerCommand = [string, ...unknown[]]

interface AnalyticsWindow extends Window {
  dataLayer?: DataLayerCommand[]
  gtag?: (...args: DataLayerCommand) => void
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
    ((...args: DataLayerCommand) => {
      analyticsWindow.dataLayer?.push(args)
    })

  analyticsWindow.gtag("js", new Date())
  analyticsWindow.gtag("config", gaId)

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    gaId,
  )}`
  script.dataset.shipyardGa = gaId
  document.head.appendChild(script)
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
