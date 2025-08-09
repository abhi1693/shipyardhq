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
    <li className={clsx("flex items-start gap-2 text-sm", subtle && "text-muted-foreground")}> 
      <span
        className={clsx(
          "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm border",
          enabled
            ? "bg-green-500 text-white border-green-600"
            : "bg-muted text-muted-foreground border-transparent",
        )}
      >
        {enabled ? <IconCheck className="h-4 w-4" /> : <IconMinus className="h-4 w-4" />}
      </span>
      <span className="leading-tight">{label}</span>
    </li>
  )
}

