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
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config = {}, className, children, style, ...props }, ref) => {
    const cssVars = React.useMemo(() => {
      const entries = Object.entries(config)
      if (!entries.length) return {}
      return Object.fromEntries(
        entries
          .filter(([, value]) => value?.color)
          .map(([key, value]) => [`--chart-${key}`, value!.color as string]),
      )
    }, [config])

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
      </div>
    )
  },
)
ChartContainer.displayName = "ChartContainer"
