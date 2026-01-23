"use client"

import { useEffect } from "react"

interface ScrollResetProps {
  triggerKey?: string | number
}

export function ScrollReset({ triggerKey }: ScrollResetProps) {
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [triggerKey])

  return null
}
