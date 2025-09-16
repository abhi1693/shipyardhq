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
        "flex items-center gap-3 text-sm",
        subtle && "text-muted-foreground",
      )}
    >
      <span
        className={clsx(
          "inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm",
          enabled
            ? "bg-emerald-100 text-emerald-600 border-emerald-200"
            : "bg-muted text-muted-foreground border-muted",
        )}
      >
        {enabled ? (
          <IconCheck aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <IconMinus aria-hidden className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="leading-tight text-foreground/90">
        {label}
      </span>
    </li>
  )
}
