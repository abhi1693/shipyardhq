"use client"

import { useEffect, useState } from "react"

import { useVisibilityGate } from "@/hooks/use-visibility-gate"
import { cn } from "@/lib/utils"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function RealtimeVisitorsCard({
  initialValue,
  className,
  intervalMs = 30000,
}: {
  initialValue: number
  className?: string
  intervalMs?: number
}) {
  const [value, setValue] = useState(initialValue)
  const { ref: containerRef, isActive } = useVisibilityGate<HTMLDivElement>()

  useEffect(() => {
    if (!isActive) return

    let canceled = false
    let timer: NodeJS.Timeout | null = null
    let controller: AbortController | null = null

    const fetchVisitors = async () => {
      try {
        if (controller) controller.abort()
        controller = new AbortController()
        const res = await fetch("/api/analytics/realtime", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { visitors?: number }
        if (!canceled && typeof data?.visitors === "number") {
          setValue(data.visitors)
        }
      } catch {
        // swallow errors; we'll try again on next interval
      }
    }

    fetchVisitors()
    if (intervalMs > 0) {
      timer = setInterval(fetchVisitors, intervalMs)
    }

    return () => {
      canceled = true
      if (controller) controller.abort()
      if (timer) clearInterval(timer)
    }
  }, [intervalMs, isActive])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center justify-between rounded-2xl border border-border/60 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
        <span>Live visitors</span>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-foreground">
          {formatNumber(value)}
        </p>
      </div>
    </div>
  )
}
