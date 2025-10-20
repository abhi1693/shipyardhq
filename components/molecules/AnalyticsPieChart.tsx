"use client"

import type { ComponentProps, ReactNode } from "react"

import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/atoms/chart"

type PieChartProps = ComponentProps<typeof PieChart>
type PieProps = Omit<ComponentProps<typeof Pie>, "ref">
type CellProps = Omit<ComponentProps<typeof Cell>, "ref">
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

export interface AnalyticsPieChartProps<DataPoint extends object> {
  data: DataPoint[]
  config: ChartConfig
  dataKey: Extract<keyof DataPoint, string>
  nameKey?: Extract<keyof DataPoint, string>
  className?: string
  height?: number
  innerRadius?: PieProps["innerRadius"]
  outerRadius?: PieProps["outerRadius"]
  strokeWidth?: number
  showLegend?: boolean
  chartProps?: Partial<PieChartProps>
  pieProps?: Partial<PieProps>
  tooltip?: {
    valueFormatter?: (value: number) => string
    labelFormatter?: (label: unknown) => string
  }
  cells?: Array<Partial<CellProps>>
  legend?: ReactNode
}

export function AnalyticsPieChart<DataPoint extends object>({
  data,
  config,
  dataKey,
  nameKey,
  className,
  height = 240,
  innerRadius,
  outerRadius,
  strokeWidth = 2,
  showLegend = false,
  chartProps,
  pieProps,
  tooltip,
  cells,
  legend,
}: AnalyticsPieChartProps<DataPoint>) {
  const formatValue =
    tooltip?.valueFormatter ??
    ((value: number) => defaultNumberFormatter.format(value))

  return (
    <ChartContainer
      config={config}
      className={className}
      showLegend={showLegend}
    >
      <div className="flex flex-col gap-4">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart {...chartProps}>
            <RechartsTooltip
              content={
                <ChartTooltip
                  valueFormatter={(value) => formatValue(coerceNumber(value))}
                  labelFormatter={tooltip?.labelFormatter}
                />
              }
            />
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              strokeWidth={strokeWidth}
              {...(pieProps as Partial<PieProps>)}
            >
              {data.map((_, index) => {
                const cellProps = cells?.[index]
                if (!cellProps)
                  return <Cell key={`${String(dataKey)}-${index}`} />
                return (
                  <Cell
                    key={`${String(dataKey)}-${index}`}
                    {...(cellProps as CellProps)}
                  />
                )
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {legend}
      </div>
    </ChartContainer>
  )
}
