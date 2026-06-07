"use client"

import type { ComponentProps } from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

type BarChartProps = ComponentProps<typeof BarChart>
type BarProps = Omit<ComponentProps<typeof Bar>, "ref">
type CartesianGridProps = ComponentProps<typeof CartesianGrid>
type CellProps = Omit<ComponentProps<typeof Cell>, "ref">
type TooltipProps = ComponentProps<typeof RechartsTooltip>
type XAxisProps = ComponentProps<typeof XAxis>
type YAxisProps = ComponentProps<typeof YAxis>

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

export type AnalyticsBarDefinition<DataPoint extends object> = {
  dataKey: Extract<keyof DataPoint, string>
  barProps?: Partial<BarProps>
  getCellProps?: (
    entry: DataPoint,
    index: number,
  ) => Partial<CellProps> | undefined
}

interface AnalyticsBarChartProps<DataPoint extends object> {
  data: DataPoint[]
  config: ChartConfig
  bars: AnalyticsBarDefinition<DataPoint>[]
  className?: string
  showLegend?: boolean
  layout?: BarChartProps["layout"]
  height?: number
  margin?: BarChartProps["margin"]
  xAxis?: Partial<XAxisProps> & { dataKey?: Extract<keyof DataPoint, string> }
  yAxis?: Partial<YAxisProps> & { dataKey?: Extract<keyof DataPoint, string> }
  grid?: false | Partial<CartesianGridProps>
  tooltip?: {
    cursor?: TooltipProps["cursor"]
    valueFormatter?: (value: number) => string
    labelFormatter?: (label: unknown) => string
  }
}

export function AnalyticsBarChart<DataPoint extends object>({
  data,
  config,
  bars,
  className,
  showLegend = false,
  layout,
  height = 280,
  margin = { left: 4, right: 12 },
  xAxis,
  yAxis,
  grid,
  tooltip,
}: AnalyticsBarChartProps<DataPoint>) {
  const formatValue =
    tooltip?.valueFormatter ??
    ((value: number) => defaultNumberFormatter.format(value))
  const resolvedGridProps =
    grid === false
      ? null
      : {
          strokeDasharray: "3 3",
          className: "stroke-muted",
          ...(grid ?? {}),
        }

  const { dataKey: xAxisKey, ...xAxisRest } = xAxis ?? {}
  const { dataKey: yAxisKey, ...yAxisRest } = yAxis ?? {}

  if (!bars.length) {
    return null
  }

  return (
    <ChartContainer
      config={config}
      className={className}
      showLegend={showLegend}
    >
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart data={data} layout={layout} margin={margin}>
          {resolvedGridProps ? <CartesianGrid {...resolvedGridProps} /> : null}
          <XAxis
            dataKey={xAxisKey as XAxisProps["dataKey"]}
            stroke="currentColor"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            {...(xAxisRest as Partial<XAxisProps>)}
          />
          <YAxis
            dataKey={yAxisKey as YAxisProps["dataKey"]}
            stroke="currentColor"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            {...(yAxisRest as Partial<YAxisProps>)}
          />
          <RechartsTooltip
            cursor={tooltip?.cursor}
            content={
              <ChartTooltip
                valueFormatter={(value) => formatValue(coerceNumber(value))}
                labelFormatter={tooltip?.labelFormatter}
              />
            }
          />
          {bars.map((definition) => {
            const barProps = (definition.barProps ?? {}) as Partial<BarProps>
            const { fill: customFill, ...restBarProps } = barProps
            const fill =
              customFill ?? `var(--chart-${String(definition.dataKey)})`

            return (
              <Bar
                key={definition.dataKey}
                dataKey={definition.dataKey as BarProps["dataKey"]}
                fill={fill}
                {...restBarProps}
              >
                {definition.getCellProps
                  ? data.map((entry, index) => {
                      const cellProps = definition.getCellProps!(entry, index)
                      return (
                        <Cell
                          key={`${definition.dataKey}-${index}`}
                          {...(cellProps ?? {})}
                        />
                      )
                    })
                  : null}
              </Bar>
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
