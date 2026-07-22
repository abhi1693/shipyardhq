"use client"

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react"

import { ANALYTICS_REPORTING_WINDOW_DAYS } from "@/lib/analytics/reportingWindow"

type VisitorPoint = {
  date: string
  visitors: number
}

const visitorFormatter = new Intl.NumberFormat("en-US")
const compactVisitorFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function formatTooltipDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatAxisDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function VisitorSparkline({
  series,
  label,
}: {
  series: VisitorPoint[] | null | undefined
  label: string
}) {
  const points = useMemo(
    () =>
      (series ?? []).slice(-ANALYTICS_REPORTING_WINDOW_DAYS).map((point) => ({
        date: point.date,
        visitors: Math.max(0, point.visitors),
      })),
    [series],
  )
  const chartPoints =
    points.length > 1
      ? points
      : points.length === 1
        ? [points[0], points[0]]
        : [
            { date: "", visitors: 0 },
            { date: "", visitors: 0 },
          ]
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const width = 320
  const height = 64
  const peakValue = Math.max(0, ...chartPoints.map((point) => point.visitors))
  const maxValue = Math.max(1, peakValue)
  const coordinates = chartPoints.map((point, index) => ({
    x: (index / Math.max(1, chartPoints.length - 1)) * width,
    y:
      peakValue === 0
        ? height / 2
        : height - 3 - (point.visitors / maxValue) * (height - 8),
  }))
  const linePoints = coordinates
    .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ")
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`
  const activePoint =
    activeIndex == null || points.length === 0 ? null : chartPoints[activeIndex]
  const activeCoordinates =
    activeIndex == null ? null : coordinates[activeIndex]
  const firstPoint = points[0]
  const latestPoint = points.at(-1)
  const totalVisitors = points.reduce(
    (total, point) => total + point.visitors,
    0,
  )

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (points.length === 0) return

    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0) return

    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    )
    setActiveIndex(Math.round(ratio * (chartPoints.length - 1)))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (points.length === 0) return

    if (event.key === "Home") {
      event.preventDefault()
      setActiveIndex(0)
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      setActiveIndex(chartPoints.length - 1)
      return
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

    event.preventDefault()
    const direction = event.key === "ArrowLeft" ? -1 : 1
    setActiveIndex((currentIndex) =>
      Math.min(
        chartPoints.length - 1,
        Math.max(0, (currentIndex ?? chartPoints.length - 1) + direction),
      ),
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            Visitors
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-none text-black">
              {compactVisitorFormatter.format(totalVisitors)}
            </span>
            <span className="text-[9px] text-[#64748B]">{label}</span>
          </div>
        </div>
        {latestPoint ? (
          <div
            aria-live="polite"
            className="min-w-32 text-right"
            role={activePoint ? "tooltip" : undefined}
          >
            <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              {activePoint ? formatTooltipDate(activePoint.date) : "Latest day"}
            </div>
            <div className="mt-1 text-sm font-bold leading-none text-[#0051d5]">
              {activePoint ? (
                <>
                  {visitorFormatter.format(activePoint.visitors)}
                  <span className="ml-1 text-[9px] font-medium text-[#64748B]">
                    {" "}
                    visitors
                  </span>
                </>
              ) : (
                compactVisitorFormatter.format(latestPoint.visitors)
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div
        aria-label={`Interactive daily visitor chart for ${label.toLowerCase()}. Use the left and right arrow keys to inspect each day.`}
        className="relative mt-1 h-14 w-full cursor-crosshair outline-none focus-visible:ring-1 focus-visible:ring-[#0051d5]/40"
        onBlur={() => setActiveIndex(null)}
        onFocus={() =>
          points.length > 0 && setActiveIndex(chartPoints.length - 1)
        }
        onKeyDown={handleKeyDown}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerMove={handlePointerMove}
        tabIndex={points.length > 0 ? 0 : -1}
      >
        <svg
          aria-label={`Daily visitors over ${label.toLowerCase()}`}
          className="h-14 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[height / 3, (height / 3) * 2].map((y) => (
            <line
              key={y}
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              stroke="#CBD5E1"
              strokeOpacity="0.55"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polygon points={areaPoints} fill="#0051d5" opacity="0.08" />
          <polyline
            points={linePoints}
            fill="none"
            stroke="#0051d5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {activeCoordinates ? (
            <>
              <line
                x1={activeCoordinates.x}
                x2={activeCoordinates.x}
                y1={activeCoordinates.y}
                y2={height}
                stroke="#0051d5"
                strokeOpacity="0.2"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={activeCoordinates.x}
                cy={activeCoordinates.y}
                r="7"
                fill="#0051d5"
                fillOpacity="0.12"
              />
              <circle
                cx={activeCoordinates.x}
                cy={activeCoordinates.y}
                r="3"
                fill="#0051d5"
                stroke="white"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}
          <rect
            width={width}
            height={height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>
      </div>

      {firstPoint && latestPoint ? (
        <div className="mt-1 flex items-center justify-between text-[9px] leading-none text-[#64748B]">
          <span>{formatAxisDate(firstPoint.date)}</span>
          <span>{formatAxisDate(latestPoint.date)}</span>
        </div>
      ) : null}
    </div>
  )
}
