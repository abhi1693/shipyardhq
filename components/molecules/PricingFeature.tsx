"use client"

import { IconCheck, IconMinus } from "@tabler/icons-react"
import clsx from "clsx"

export function PricingFeature({
  label,
  enabled,
  subtle = false,
}: {
  label: string
  enabled: boolean
  subtle?: boolean
}) {
  return (
    <li
      className={clsx(
        "flex items-center gap-3 text-sm text-foreground/90",
        subtle && "text-muted-foreground",
      )}
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
      <span className="leading-tight text-foreground/90">{label}</span>
    </li>
  )
}
