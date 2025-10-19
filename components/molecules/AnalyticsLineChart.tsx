'use client'

import type { ComponentProps } from "react"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/atoms/chart"

type LineChartProps = ComponentProps<typeof LineChart>
type LineProps = Omit<ComponentProps<typeof Line>, "ref">

const defaultNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

const coerceNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export type AnalyticsLineDefinition<DataPoint extends object> = {
  dataKey: Extract<keyof DataPoint, string>
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  dot?: LineProps["dot"]
  activeDot?: LineProps["activeDot"]
  type?: LineProps["type"]
}

interface AnalyticsLineChartProps<DataPoint extends object> {
  data: DataPoint[]
  config: ChartConfig
  lines: AnalyticsLineDefinition<DataPoint>[]
  className?: string
  showLegend?: boolean
  height?: number
  xKey?: Extract<keyof DataPoint, string>
  yTickFormatter?: (value: number) => string
  tooltipFormatter?: (value: number) => string
  tooltipLabelFormatter?: (label: unknown) => string
  cursorStroke?: string
  margin?: LineChartProps["margin"]
}

export function AnalyticsLineChart<DataPoint extends object>({
  data,
  config,
  lines,
  className,
  showLegend = true,
  height = 260,
  xKey,
  yTickFormatter,
  tooltipFormatter,
  tooltipLabelFormatter,
  cursorStroke,
  margin = { left: 4, right: 12 },
}: AnalyticsLineChartProps<DataPoint>) {
  const formatValue =
    tooltipFormatter ??
    ((value: number) => defaultNumberFormatter.format(value))
  const formatYAxis = yTickFormatter ?? formatValue
  const resolvedXKey = xKey ?? ("label" as keyof DataPoint & string)

  return (
    <ChartContainer
      config={config}
      showLegend={showLegend}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey={resolvedXKey}
            stroke="currentColor"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatYAxis(coerceNumber(value))}
          />
          <RechartsTooltip
            cursor={
              cursorStroke
                ? { strokeDasharray: "3 3", stroke: cursorStroke }
                : { strokeDasharray: "3 3" }
            }
            content={
              <ChartTooltip
                valueFormatter={(value) => formatValue(coerceNumber(value))}
                labelFormatter={tooltipLabelFormatter}
              />
            }
          />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type={line.type ?? "monotone"}
              dataKey={line.dataKey}
              stroke={line.stroke ?? `var(--chart-${line.dataKey})`}
              strokeWidth={line.strokeWidth ?? 2}
              dot={line.dot ?? false}
              activeDot={line.activeDot ?? { r: 4 }}
              strokeDasharray={line.strokeDasharray}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
