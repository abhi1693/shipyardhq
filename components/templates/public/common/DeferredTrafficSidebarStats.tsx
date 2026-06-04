"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

import { useVisibilityGate } from "@/hooks/use-visibility-gate"
import { TrafficSidebarStatsSkeleton } from "./TrafficSidebarStatsSkeleton"
import type { TrafficSidebarStatsPayload } from "./TrafficSidebarStatsContent"

const DeferredTrafficSidebarStatsContent = dynamic(() =>
  import("./TrafficSidebarStatsContent").then(
    (module) => module.TrafficSidebarStatsContent,
  ),
)

function runWhenIdle(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(callback, { timeout: 2000 })
    return () => window.cancelIdleCallback(handle)
  }

  const handle = globalThis.setTimeout(callback, 300)
  return () => globalThis.clearTimeout(handle)
}

export function DeferredTrafficSidebarStats({
  className,
}: {
  className?: string
}) {
  const { ref, isActive } = useVisibilityGate<HTMLDivElement>({
    rootMargin: "160px 0px",
  })
  const [stats, setStats] = useState<TrafficSidebarStatsPayload | null>(null)
  const hasRequestedRef = useRef(false)

  useEffect(() => {
    if (!isActive || hasRequestedRef.current) return undefined

    let canceled = false
    const controller = new AbortController()

    const cancelIdleCallback = runWhenIdle(() => {
      hasRequestedRef.current = true

      fetch("/api/analytics/sidebar-stats", {
        signal: controller.signal,
        headers: {
          accept: "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load sidebar stats: ${response.status}`)
          }
          return response.json() as Promise<TrafficSidebarStatsPayload>
        })
        .then((payload) => {
          if (!canceled) {
            setStats(payload)
          }
        })
        .catch(() => {
          if (!canceled) {
            setStats({
              pageViews30: 0,
              visitors30: 0,
              trafficSeries: [],
              realtimeVisitors: 0,
            })
          }
        })
    })

    return () => {
      canceled = true
      cancelIdleCallback()
      controller.abort()
    }
  }, [isActive])

  return (
    <div ref={ref}>
      {stats ? (
        <DeferredTrafficSidebarStatsContent
          stats={stats}
          className={className}
        />
      ) : (
        <TrafficSidebarStatsSkeleton className={className} />
      )}
    </div>
  )
}
