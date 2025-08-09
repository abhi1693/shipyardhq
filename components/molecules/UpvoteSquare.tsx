"use client"

import clsx from "clsx"
import { ChevronsUp } from "lucide-react"

export function UpvoteSquare({
  count,
  compact = false,
  className,
  title,
}: {
  count: number
  compact?: boolean
  className?: string
  title?: string
}) {
  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center rounded-md text-foreground transition-colors px-2",
        compact ? "w-14 h-14 bg-transparent" : "w-16 h-16 bg-muted",
        className,
      )}
      aria-label="Upvotes"
      title={title ?? `${count} upvotes`}
    >
      <div className="inline-flex items-center justify-center gap-2">
        <ChevronsUp
          className={clsx(
            "text-muted-foreground",
            compact ? "w-4 h-4" : "w-6 h-6",
          )}
        />
        <span
          className={clsx(
            "font-bold leading-none",
            compact ? "text-base" : "text-2xl",
          )}
        >
          {count}
        </span>
      </div>
    </div>
  )
}
