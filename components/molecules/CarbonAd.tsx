"use client"

import { useEffect, useRef, useState } from "react"

import { claimAdDocument } from "@/lib/ads/document"
import { isCarbonDiscoveryPath } from "@/lib/ads/placement"
import { cn } from "@/lib/utils"

type CarbonAdProps = {
  pathname: string
  format?: "cover" | "responsive"
  className?: string
}

export function CarbonAd({
  pathname,
  format = "cover",
  className,
}: CarbonAdProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const eligible = isCarbonDiscoveryPath(pathname)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !eligible) return

    // Deferring a task avoids issuing two requests during React Strict Mode's
    // setup/cleanup/setup cycle. No scroll or interaction is needed to load it.
    const load = () => {
      if (container.getBoundingClientRect().width === 0) return
      if (
        !isCarbonDiscoveryPath(location.pathname) ||
        !claimAdDocument("carbon")
      )
        return
      if (document.getElementById("_carbonads_js")) return

      const script = document.createElement("script")
      script.id = "_carbonads_js"
      script.async = true
      script.type = "text/javascript"
      script.src = `https://cdn.carbonads.com/carbon.js?serve=CWBI4KJN&placement=shipyardhqdev&format=${format}`
      script.onerror = () => setFailed(true)
      container.appendChild(script)
      observer?.disconnect()
    }
    // Hidden mobile slots make no requests. If the viewport becomes wide enough,
    // load once when the slot acquires space, without refreshing on later resizes.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(load)
    observer?.observe(container)
    const timer = window.setTimeout(load, 0)

    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
      const script = container.querySelector("script")
      if (script) script.onerror = null
      container.replaceChildren()
    }
  }, [eligible, format, pathname])

  if (!eligible || failed) return null

  return (
    <div
      ref={containerRef}
      aria-label="Advertisement via Carbon"
      data-carbon-placement
      className={cn(
        "hidden w-full max-w-[400px] text-left xl:block",
        format === "cover" ? "min-h-[280px]" : "min-h-[155px]",
        className,
      )}
    />
  )
}
