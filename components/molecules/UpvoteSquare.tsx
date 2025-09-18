"use client"

import clsx from "clsx"
import { ChevronsUp } from "lucide-react"

export function UpvoteSquare({
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
  return (
    <div
      className={clsx(
        "inline-flex select-none items-center gap-2 rounded-lg border border-[color:var(--brand-1)/0.22] bg-background/90 px-3 py-1.5 text-[color:var(--brand-1)] shadow-[0px_15px_35px_-30px_rgba(7,58,104,0.6)] transition-colors",
        compact && "gap-1 px-2.5 py-1 text-xs",
        pending && "opacity-70",
        active &&
          "border-[color:var(--brand-2)/0.4] text-[color:var(--brand-2)]",
        className,
      )}
      aria-label="Upvotes"
      title={title ?? `${count} upvotes`}
    >
      <ChevronsUp
        className={clsx(
          compact ? "h-3 w-3" : "h-4 w-4",
          pop && "animate-pop",
        )}
      />
      <span
        className={clsx(
          "font-semibold leading-none transition-transform duration-150",
          compact ? "text-xs" : "text-base",
          pop && "animate-count-bump",
        )}
      >
        {count}
      </span>
    </div>
  )
}
