"use client"

import clsx from "clsx"
import { Triangle } from "lucide-react"

type ProductScoreProps = {
  count: number
  label?: string
  className?: string
  compact?: boolean
}

export function ProductScore({
  count,
  label = "points",
  className,
  compact = false,
}: ProductScoreProps) {
  const baseStyles =
    "inline-flex select-none items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-200 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.35)]"
  const colorStyles =
    "border-[color:var(--brand-1)/0.5] bg-[color:var(--brand-1)/0.08] text-[color:var(--brand-1)]"
  const compactStyles = "px-2.5 py-1 text-xs"

  const iconWrapperStyles =
    "inline-flex h-5 w-5 items-center justify-center text-[color:var(--brand-1)]"
  const iconCompactStyles = "h-4 w-4"

  return (
    <div
      className={clsx(
        baseStyles,
        colorStyles,
        compact && compactStyles,
        className,
      )}
      aria-label={label}
      title={`${count} ${label}`}
    >
      <span
        className={clsx(iconWrapperStyles, compact && iconCompactStyles)}
        aria-hidden
      >
        <Triangle
          className="h-full w-full"
          fill="currentColor"
          strokeWidth={1.5}
        />
      </span>
      <span
        className={clsx(
          "leading-none transition-transform duration-150",
          compact ? "text-sm" : "text-base",
        )}
        suppressHydrationWarning
      >
        {count}
      </span>
    </div>
  )
}
