"use client"

import { useEffect, useRef, useState } from "react"
import { preconnect, preload } from "react-dom"

import { CARBON_SCRIPT_URL, CARBON_SERVING_ORIGIN } from "@/lib/ads/config"
import { claimAdDocument } from "@/lib/ads/document"
import { isCarbonAdPath } from "@/lib/ads/placement"
import { cn } from "@/lib/utils"

export function CarbonAd({
  pathname,
  variant = "standard",
  className,
}: {
  pathname: string
  variant?: "standard" | "banner"
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [duplicate, setDuplicate] = useState(false)
  const eligible = isCarbonAdPath(pathname)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !eligible) return
    let started = false
    let script: HTMLScriptElement | undefined
    const load = () => {
      if (started || !container.getBoundingClientRect().width) return
      if (!isCarbonAdPath(location.pathname) || !claimAdDocument()) return
      started = true
      observer.disconnect()
      // Keep the claim for the document's lifetime, including no-fill, failure,
      // and remounts. A second component must never request another Carbon ad.
      if (
        document.documentElement.dataset.carbonAdRequested ||
        document.getElementById("_carbonads_js")
      ) {
        setDuplicate(true)
        return
      }
      document.documentElement.dataset.carbonAdRequested = "true"
      script = document.createElement("script")
      script.async = true
      script.type = "text/javascript"
      script.id = "_carbonads_js"
      script.src = CARBON_SCRIPT_URL
      container.appendChild(script)
    }
    const observer = new ResizeObserver(load)
    observer.observe(container)
    // Strict Mode's first setup is cleaned up before this task can request ads.
    const timer = window.setTimeout(load, 0)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      script?.remove()
      container.replaceChildren()
    }
  }, [eligible, pathname, variant])

  if (!eligible || duplicate) return null

  // Fetch the runtime and warm its serving connection from the initial HTML.
  // Execution stays in the client effect, after visibility and document checks.
  if (typeof window === "undefined") {
    preconnect(CARBON_SERVING_ORIGIN, { crossOrigin: "anonymous" })
    preload(CARBON_SCRIPT_URL, {
      as: "script",
      fetchPriority: "low",
    })
  }

  return (
    <div
      ref={containerRef}
      style={{ minHeight: 155 }}
      className={cn(
        "w-full max-w-[400px] text-left",
        variant === "standard" && "mx-auto lg:mx-0",
        className,
      )}
      data-carbon-placement
      aria-label="Advertisement via Carbon"
    />
  )
}
