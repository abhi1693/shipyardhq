"use client"

import { useEffect } from "react"
import Clarity from "@microsoft/clarity"
import { CLARITY_PROJECT_ID, IS_PROD } from "@/lib/constants"

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void
  }
}

export function ClarityAnalytics() {
  useEffect(() => {
    if (!IS_PROD) return
    if (!CLARITY_PROJECT_ID) return
    if (typeof window === "undefined") return
    if (typeof window.clarity === "function") return

    Clarity.init(CLARITY_PROJECT_ID)
  }, [])

  return null
}
