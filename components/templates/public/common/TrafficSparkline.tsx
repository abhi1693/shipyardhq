"use client"

import { useMemo, useState } from "react"

export type SparklinePoint = { label: string; value: number }

export function TrafficSparkline({
  color = "#2563eb",
  points,
}: {
  color?: string
  points: SparklinePoint[]
}) {
  const height = 40
  const width = 240
  const values = points.map((p) => p.value)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const step = width / Math.max(points.length - 1, 1)
  const d = useMemo(
    () =>
      points
        .map((point, index) => {
          const x = step * index
          const y = height - ((point.value - min) / range) * height
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
        })
        .join(" "),
    [points, step, height, min, range],
  )

  const [tooltip, setTooltip] = useState<{
    label: string
    value: number
    x: number
    y: number
    visible: boolean
  }>({ label: "", value: 0, x: 0, y: 0, visible: false })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="presentation"
        aria-hidden="true"
        className="h-10 w-full text-blue-600"
      >
        <path
          d={`${d} L ${width} ${height} L 0 ${height} Z`}
          fill={color + "1a"}
          stroke="none"
        />
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
        {points.map((point, index) => {
          const x = step * index
          const y = height - ((point.value - min) / range) * height
          return (
            <g key={`${point.label}-${index}`}>
              <circle
                cx={x}
                cy={y}
                r={10}
                fill="transparent"
                stroke="transparent"
                strokeWidth={1}
                onMouseEnter={(event) => {
                  const bounds = (
                    event.currentTarget as SVGCircleElement
                  ).getBoundingClientRect()
                  const parentBounds =
                    event.currentTarget.ownerSVGElement?.getBoundingClientRect() ??
                    bounds
                  setTooltip({
                    label: point.label,
                    value: point.value,
                    x: bounds.left - parentBounds.left + bounds.width / 2,
                    y: bounds.top - parentBounds.top,
                    visible: true,
                  })
                  setHoveredIndex(index)
                }}
                onMouseLeave={() => {
                  setTooltip((prev) => ({ ...prev, visible: false }))
                  setHoveredIndex(null)
                }}
              />
              {hoveredIndex === index ? (
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={color}
                  stroke="white"
                  strokeWidth={1}
                />
              ) : null}
            </g>
          )
        })}
      </svg>
      {tooltip.visible ? (
        <div
          className="pointer-events-none absolute rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y - 6,
            transform: "translate(-50%, -100%)",
            minWidth: 96,
            textAlign: "center",
          }}
        >
          <span className="block text-[10px] font-medium text-background/80">
            {tooltip.label}
          </span>
          <span className="block">{tooltip.value.toLocaleString()}</span>
        </div>
      ) : null}
    </div>
  )
}
