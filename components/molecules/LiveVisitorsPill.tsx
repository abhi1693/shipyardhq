"use client"

import { useEffect, useState } from "react"

import { useVisibilityGate } from "@/hooks/use-visibility-gate"

const formatter = new Intl.NumberFormat("en-US")

export function LiveVisitorsPill({
  initialVisitors,
}: {
  initialVisitors: number
}) {
  const [count, setCount] = useState(initialVisitors)
  const { ref: containerRef, isActive } = useVisibilityGate<HTMLDivElement>()

  useEffect(() => {
    if (!isActive) return

    let timeout: ReturnType<typeof setTimeout> | null = null
    let aborted = false
    let controller: AbortController | null = null

    const fetchCount = async () => {
      try {
        if (controller) controller.abort()
        controller = new AbortController()
        const res = await fetch("/api/analytics/realtime", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { visitors?: number }
        if (aborted) return
        if (
          typeof data.visitors === "number" &&
          Number.isFinite(data.visitors)
        ) {
          setCount(data.visitors)
        }
      } catch {
        // ignore errors; retry on next interval
      } finally {
        if (!aborted) {
          timeout = setTimeout(fetchCount, 15000)
        }
      }
    }

    fetchCount()
    return () => {
      aborted = true
      if (controller) controller.abort()
      if (timeout) clearTimeout(timeout)
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 shadow-sm"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <div className="flex items-baseline gap-1 text-sm font-semibold text-emerald-900">
        <span>{formatter.format(count)}</span>
        <span className="text-[11px] font-medium text-emerald-700">live</span>
      </div>
    </div>
  )
}
