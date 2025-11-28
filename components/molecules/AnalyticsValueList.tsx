import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

import { ValueBarRow } from "./AnalyticsShared"

type ValueBarRowProps = Omit<
  ComponentProps<typeof ValueBarRow>,
  "value" | "max" | "left" | "right" | "tone"
>

export type AnalyticsValueListItem = {
  key: string
  value: number
  left: ReactNode
  right?: ReactNode
  tone?: "blue" | "indigo"
}

export function AnalyticsValueList({
  items,
  max,
  emptyLabel,
  emptyClassName,
  className,
  itemClassName,
  tone,
  valueBarRowProps,
}: {
  items: AnalyticsValueListItem[]
  max?: number
  emptyLabel: string
  emptyClassName?: string
  className?: string
  itemClassName?: string
  tone?: "blue" | "indigo"
  valueBarRowProps?: ValueBarRowProps
}) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex h-24 items-center justify-center text-sm text-slate-500",
          emptyClassName,
        )}
      >
        {emptyLabel}
      </div>
    )
  }

  const resolvedMax =
    max ??
    items.reduce((currentMax, item) => Math.max(currentMax, item.value), 0)
  const safeMax = resolvedMax > 0 ? resolvedMax : 1

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div key={item.key} className={itemClassName}>
          <ValueBarRow
            value={item.value}
            max={safeMax}
            left={item.left}
            right={item.right}
            tone={item.tone ?? tone}
            {...valueBarRowProps}
          />
        </div>
      ))}
    </div>
  )
}
