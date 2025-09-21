"use client"

import * as React from "react"

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
                <span className="font-medium text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  },
)
ChartContainer.displayName = "ChartContainer"
