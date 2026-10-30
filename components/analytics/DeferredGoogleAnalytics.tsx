"use client"

import { useEffect } from "react"
import { captureBrowserAcquisition } from "@/components/analytics/browserAcquisition"
import {
  acquisitionTouchFromLocation,
  type AcquisitionTouch,
} from "@/lib/analytics/acquisition"

type GtagCommand = [string, ...unknown[]]
type Gtag = (...args: GtagCommand) => void

interface AnalyticsWindow extends Window {
  dataLayer?: IArguments[]
  gtag?: Gtag
}

function loadGoogleAnalytics(gaId: string, landing?: AcquisitionTouch) {
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
  captureBrowserAcquisition(gaId, analyticsWindow.gtag, landing)
}

export function DeferredGoogleAnalytics({ gaId }: { gaId: string }) {
  useEffect(() => {
    let loaded = false
    let lastRefresh = 0
    const landing = acquisitionTouchFromLocation(
      location.pathname,
      location.search,
      document.referrer,
    )

    const loadOnce = () => {
      if (loaded) {
        if (Date.now() - lastRefresh < 60_000) return
        const analyticsWindow = window as AnalyticsWindow
        const flags = window as unknown as Record<string, unknown>
        if (!flags[`ga-disable-${gaId}`] && analyticsWindow.gtag) {
          lastRefresh = Date.now()
          captureBrowserAcquisition(gaId, analyticsWindow.gtag)
        }
        return
      }
      loaded = true
      lastRefresh = Date.now()
      loadGoogleAnalytics(gaId, landing)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        loadOnce()
      }
    }

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
    ]

    events.forEach((eventName) => {
      window.addEventListener(eventName, loadOnce, {
        passive: true,
      })
    })
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", loadOnce, { once: true })

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, loadOnce)
      })
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", loadOnce)
    }
  }, [gaId])

  return null
}
