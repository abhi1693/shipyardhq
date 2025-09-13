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
        "inline-flex items-center justify-center rounded-md text-foreground transition-colors px-2 select-none",
        compact ? "w-8 h-8 bg-transparent" : "w-16 h-16 bg-transparent",
        pending && "opacity-70",
        className,
      )}
      aria-label="Upvotes"
      title={title ?? `${count} upvotes`}
    >
      <div className="inline-flex items-center justify-center gap-2">
        <ChevronsUp
          className={clsx(
            active ? "text-primary" : "text-muted-foreground",
            compact ? "w-3 h-3" : "w-6 h-6",
            "transition-transform duration-150",
            pop && "animate-pop",
          )}
        />
        <span
          className={clsx(
            "font-bold leading-none transition-transform duration-150",
            compact ? "text-xs" : "text-2xl",
            pop && "animate-count-bump",
          )}
        >
          {count}
        </span>
      </div>
    </div>
  )
}
