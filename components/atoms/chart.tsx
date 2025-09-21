"use client"

import * as React from "react"

import type { TooltipProps } from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: string
    color?: string
  }
>

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config?: ChartConfig
  showLegend?: boolean
}

const ChartConfigContext = React.createContext<ChartConfig>({})

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  ChartContainerProps
>(
  (
    { config = {}, className, children, style, showLegend = false, ...props },
    ref,
  ) => {
    const cssVars = React.useMemo(() => {
      const entries = Object.entries(config)
      if (!entries.length) return {}
      return Object.fromEntries(
        entries
          .filter(([, value]) => value?.color)
          .map(([key, value]) => [`--chart-${key}`, value!.color as string]),
      )
    }, [config])

    const legendItems = React.useMemo(
      () =>
        Object.entries(config)
          .map(([key, value]) => ({
            key,
            label: value?.label ?? key,
            color: value?.color,
          }))
          .filter((item) => Boolean(item.label)),
      [config],
    )

    return (
      <ChartConfigContext.Provider value={config}>
        <div
          ref={ref}
          className={cn(
            "flex w-full flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm",
            className,
          )}
          style={{ ...(style as React.CSSProperties), ...cssVars }}
          {...props}
        >
          {children}
          {showLegend && legendItems.length ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {legendItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: item.color ?? `var(--chart-${item.key})`,
                    }}
                    aria-hidden
                  />
                  <span className="font-medium text-slate-600">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </ChartConfigContext.Provider>
    )
  },
)
ChartContainer.displayName = "ChartContainer"

type ChartTooltipProps = TooltipProps<number, string> & {
  labelFormatter?: (label: string | number) => React.ReactNode
  valueFormatter?: (value: number, seriesKey?: string) => React.ReactNode
  hideLabel?: boolean
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideLabel = false,
}: ChartTooltipProps) {
  const config = React.useContext(ChartConfigContext)

  if (!active || !payload?.length) {
    return null
  }

  const entries = payload
    .map((item) => {
      if (item == null || item.value == null) return null
      const dataKey = String(item.dataKey ?? item.name ?? "value")
      const configEntry = config[dataKey]
      const resolvedColor =
        configEntry?.color ??
        (item.color as string | undefined) ??
        `var(--chart-${dataKey})`

      return {
        key: dataKey,
        name: configEntry?.label ?? item.name ?? dataKey,
        color: resolvedColor,
        value: typeof item.value === "number" ? item.value : Number(item.value),
      }
    })
    .filter(
      (
        item,
      ): item is { key: string; name: string; color: string; value: number } =>
        Boolean(item),
    )

  if (!entries.length) {
    return null
  }

  const fallbackLabel =
    typeof label === "number" || typeof label === "string"
      ? label
      : (payload?.[0]?.payload?.label ??
        payload?.[0]?.payload?.browserLabel ??
        payload?.[0]?.payload?.country ??
        payload?.[0]?.payload?.referrer ??
        payload?.[0]?.payload?.name ??
        "")

  const formattedLabel = !hideLabel
    ? labelFormatter
      ? labelFormatter(fallbackLabel)
      : fallbackLabel
    : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg">
      {formattedLabel ? (
        <div className="mb-2 font-medium text-slate-500">{formattedLabel}</div>
      ) : null}
      <div className="flex flex-col gap-1 text-slate-600">
        {entries.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2">
            <span
              className="inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="flex-1 font-medium">{entry.name}</span>
            <span className="font-semibold text-slate-900">
              {valueFormatter
                ? valueFormatter(entry.value, entry.key)
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
