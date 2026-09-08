"use client"

import { useEffect, useRef, useState } from "react"

import { CARBON_SCRIPT_URL } from "@/lib/ads/config"
import { claimAdDocument } from "@/lib/ads/document"
import { isCarbonDiscoveryPath } from "@/lib/ads/placement"
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
  const eligible = isCarbonDiscoveryPath(pathname)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !eligible) return
    let started = false
    let script: HTMLScriptElement | undefined
    const load = () => {
      if (started || !container.getBoundingClientRect().width) return
      if (
        !isCarbonDiscoveryPath(location.pathname) ||
        !claimAdDocument("carbon")
      )
        return
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
  return (
    <div
      ref={containerRef}
      style={{ minHeight: 155 }}
      className={cn(
        "w-full max-w-[400px] text-left",
        variant === "standard" && "hidden xl:block",
        className,
      )}
      data-carbon-placement
      aria-label="Advertisement via Carbon"
    />
  )
}
