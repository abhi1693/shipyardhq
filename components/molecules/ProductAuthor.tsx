"use client"

import clsx from "clsx"
import { Avatar, AvatarFallback } from "@/components/atoms/avatar"

export function ProductAuthor({
  name,
  initial,
  compact = false,
  className,
}: {
  name: string
  initial: string
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 group text-xs text-muted-foreground",
        className,
      )}
      title={name}
    >
      <Avatar className={clsx("border", compact ? "h-4 w-4" : "h-5 w-5")}>
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <span className="group-hover:underline text-foreground/90 truncate max-w-[160px]">
        {name}
      </span>
    </div>
  )
}
