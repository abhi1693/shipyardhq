"use client"

import { IconCheck, IconMinus } from "@tabler/icons-react"
import clsx from "clsx"
import { Badge } from "@/components/atoms/badge"

export function PricingFeature({
  label,
  enabled,
  subtle = false,
  description,
  isExperimental = false,
}: {
  label: string
  enabled: boolean
  subtle?: boolean
  description?: string | null
  isExperimental?: boolean
}) {
  return (
    <li
      className={clsx(
        "flex items-center gap-3 text-sm text-foreground/90",
        subtle && "text-muted-foreground",
      )}
      title={description || undefined}
    >
      <span
        className={clsx(
          "inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm",
          enabled
            ? "border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)/0.12] text-[color:var(--brand-1)]"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        {enabled ? (
          <IconCheck aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <IconMinus aria-hidden className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="flex flex-wrap items-center gap-2 leading-tight text-foreground/90">
        <span>{label}</span>
        {isExperimental ? (
          <Badge
            variant="outline"
            className="border-dashed border-[color:var(--brand-2)/0.55] bg-transparent text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--brand-2)]"
          >
            Experimental
          </Badge>
        ) : null}
      </div>
    </li>
  )
}
