"use client"

import { useEffect, useState } from "react"
import { useLinkStatus } from "next/link"
import { cn } from "@/lib/utils"

type LinkPendingIndicatorProps = {
  className?: string
  delayMs?: number
}

const DEFAULT_DELAY = 120

/**
 * Small inline hint that fades in when a navigation triggered by a Link is still pending.
 * Keeps a fixed footprint to avoid layout shifts while toggling pending state.
 */
export function LinkPendingIndicator(props: LinkPendingIndicatorProps) {
  const { className, delayMs = DEFAULT_DELAY } = props
  const { pending } = useLinkStatus()
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    if (!pending) {
      setShouldAnimate(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setShouldAnimate(true)
    }, delayMs)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [pending, delayMs])

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-[0.6rem] w-[0.6rem] shrink-0 items-center justify-center overflow-visible",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/15" />
      <span
        className={cn(
          "absolute h-1.5 w-1.5 rounded-full bg-current opacity-0 transition-opacity duration-200 ease-out",
          pending ? "opacity-70" : "opacity-0",
        )}
      />
      <span
        className={cn(
          "absolute h-1.5 w-1.5 rounded-full bg-current opacity-0",
          shouldAnimate && pending
            ? "animate-[ping_1.3s_ease-out_infinite] opacity-60"
            : "opacity-0",
        )}
      />
    </span>
  )
}
