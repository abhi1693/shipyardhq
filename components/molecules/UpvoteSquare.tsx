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
        "inline-flex select-none items-center gap-3 rounded-full border border-transparent bg-[#EEF0F6] px-5 py-2 text-base font-semibold text-[#1C2333] shadow-[0_16px_40px_-30px_rgba(28,35,51,0.45)] transition-all duration-200",
        compact && "gap-2 px-4 py-1.5 text-sm",
        pending && "opacity-60",
        active &&
          "bg-[#1C2333] text-white shadow-[0_24px_50px_-30px_rgba(16,23,42,0.65)]",
        className,
      )}
      aria-label="Upvotes"
      title={title ?? `${count} upvotes`}
      data-active={active ? "true" : "false"}
    >
      <ChevronsUp
        className={clsx(
          compact ? "h-4 w-4" : "h-5 w-5",
          pop && "animate-pop",
        )}
      />
      <span
        className={clsx(
          "font-semibold leading-none transition-transform duration-150",
          compact ? "text-base" : "text-2xl",
          pop && "animate-count-bump",
        )}
      >
        {count}
      </span>
    </div>
  )
}
