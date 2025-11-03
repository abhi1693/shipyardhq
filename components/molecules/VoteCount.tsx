"use client"

import clsx from "clsx"
import { Crown } from "lucide-react"

export function VoteCount({
  count,
  compact = false,
  className,
  title,
  active = false,
  pending = false,
  pop = false,
}: {
  count: number
  compact?: boolean
  className?: string
  title?: string
  active?: boolean
  pending?: boolean
  pop?: boolean
}) {
  const baseStyles =
    "inline-flex select-none items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-200 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.35)]"
  const idleStyles = "border-slate-200 bg-white text-slate-800"
  const activeStyles =
    "border-[color:var(--brand-1)] bg-white text-[color:var(--brand-1)] shadow-[0_10px_28px_-12px_rgba(31,82,201,0.35)]"
  const compactStyles = "px-2.5 py-1 text-xs"

  const iconWrapperStyles =
    "inline-flex size-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 transition-colors"
  const iconActiveStyles =
    "border-[color:var(--brand-1)]/40 bg-[color:var(--brand-1)]/10 text-[color:var(--brand-1)] shadow-[0_4px_12px_-8px_rgba(31,82,201,0.45)]"
  const iconCompactStyles = "size-5"

  return (
    <div
      className={clsx(
        baseStyles,
        idleStyles,
        pending && "opacity-70",
        compact && compactStyles,
        active && activeStyles,
        className,
      )}
      aria-label="Upvotes"
      title={title ?? `${count} upvotes`}
      data-active={active ? "true" : "false"}
    >
      <span
        className={clsx(
          iconWrapperStyles,
          compact && iconCompactStyles,
          active && iconActiveStyles,
        )}
      >
        <Crown
          className={clsx(
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
            pop && "animate-pop",
          )}
          aria-hidden
          fill={active ? "currentColor" : "none"}
        />
      </span>
      <span
        className={clsx(
          "leading-none transition-transform duration-150",
          compact ? "text-sm" : "text-base",
          pop && "animate-count-bump",
        )}
      >
        {count}
      </span>
    </div>
  )
}
