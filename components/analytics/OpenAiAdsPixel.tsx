"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  consentChanged,
  hasPixelConsent,
  setPixelConsent,
  syncPixelConsent,
} from "@/lib/analytics/openaiPixel"

export function OpenAiAdsPixel() {
  const pathname = usePathname()
  const lastPathname = useRef<string | null>(null)
  useEffect(() => {
    syncPixelConsent()
    window.addEventListener("storage", syncPixelConsent)
    return () => window.removeEventListener("storage", syncPixelConsent)
  }, [])
  useEffect(() => {
    if (!pathname || pathname === lastPathname.current) return
    lastPathname.current = pathname
    if (hasPixelConsent()) {
      window.oaiq?.("measure", "page_viewed", { type: "contents" })
    }
  }, [pathname])
  return null
}

export function PixelPreference() {
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    const refresh = () => setEnabled(hasPixelConsent())
    refresh()
    window.addEventListener("storage", refresh)
    window.addEventListener(consentChanged, refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener(consentChanged, refresh)
    }
  }, [])
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            try {
              setPixelConsent(event.target.checked)
              setError(false)
            } catch {
              setError(true)
            }
          }}
        />{" "}
        Allow ChatGPT Ads measurement on this browser
      </label>
      <p>
        ChatGPT Ads measurement is on by default. OpenAI uses attribution
        cookies to measure page visits, paid checkout starts, confirmed
        subscriptions and one-time purchases, and completed email registrations
        from ChatGPT ads. You can turn measurement off here at any time.
      </p>
      {error && (
        <p role="alert">Your browser could not save this preference.</p>
      )}
    </div>
  )
}
