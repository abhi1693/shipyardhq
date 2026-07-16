"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

import type { TrafficStatsPayload } from "./TrafficStatsPanel"
import { cn } from "@/lib/utils"

const TrafficStatsPanel = dynamic(
  () =>
    import("./TrafficStatsPanel").then((module) => module.TrafficStatsPanel),
  {
    ssr: false,
    loading: () => <TrafficStatsPanelSkeleton />,
  },
)

function TrafficStatsPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("@container", className)} aria-hidden>
      <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2">
        <div className="min-h-[150px] rounded-xl border border-[#E2E8F0] bg-white shadow-sm" />
        <div className="min-h-[150px] rounded-xl border border-[#E2E8F0] bg-white shadow-sm" />
      </div>
    </div>
  )
}

export function LazyTrafficStatsPanel({
  initialStats,
  className,
}: {
  initialStats: TrafficStatsPayload
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element || shouldLoad) return

    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = globalThis.setTimeout(() => setShouldLoad(true), 0)
      return () => globalThis.clearTimeout(timeoutId)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldLoad(true)
        observer.disconnect()
      },
      { rootMargin: "360px 0px" },
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [shouldLoad])

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <TrafficStatsPanel initialStats={initialStats} className="h-full" />
      ) : (
        <TrafficStatsPanelSkeleton className="h-full" />
      )}
    </div>
  )
}
