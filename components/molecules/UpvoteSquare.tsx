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
        "inline-flex select-none items-center gap-3 rounded-full border border-border bg-muted px-5 py-2 text-base font-semibold text-foreground shadow-sm transition-colors",
        compact && "gap-2 rounded-full px-3.5 py-1.5 text-sm",
        pending && "opacity-70",
        active && "border-foreground bg-white text-foreground shadow-md",
        className,
      )}
      aria-label="Upvotes"
      title={title ?? `${count} upvotes`}
    >
      <ChevronsUp
        className={clsx(compact ? "h-4 w-4" : "h-5 w-5", pop && "animate-pop")}
      />
      <span
        className={clsx(
          "font-semibold leading-none transition-transform duration-150",
          compact ? "text-xl" : "text-3xl",
          pop && "animate-count-bump",
        )}
      >
        {count}
      </span>
    </div>
  )
}
