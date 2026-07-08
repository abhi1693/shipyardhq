"use client"

import Script from "next/script"
import { useEffect, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>
  }
}

const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT?.trim() ||
  "ca-pub-2522305586632821"
const ADSENSE_IN_FEED_SLOT =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_IN_FEED_SLOT?.trim() || "4584023086"
const ADSENSE_IN_FEED_LAYOUT_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_IN_FEED_LAYOUT_KEY?.trim() ||
  "-fb+5w+4e-db+86"
const ADSENSE_DISPLAY_SLOT =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_DISPLAY_SLOT?.trim() || "7529750629"

type GoogleAdsenseVariant = "in-feed" | "display"

type GoogleAdsenseUnitProps = {
  variant?: GoogleAdsenseVariant
  slot?: string
  className?: string
  format?: string
  layoutKey?: string
  fullWidthResponsive?: boolean
  style?: CSSProperties
}

export function GoogleAdsenseUnit({
  variant = "in-feed",
  slot,
  className,
  format,
  layoutKey,
  fullWidthResponsive,
  style,
}: GoogleAdsenseUnitProps) {
  const isDisplay = variant === "display"
  const normalizedSlot = (
    slot ??
    (isDisplay ? ADSENSE_DISPLAY_SLOT : ADSENSE_IN_FEED_SLOT)
  ).trim()
  const resolvedFormat = format ?? (isDisplay ? "auto" : "fluid")
  const normalizedLayoutKey = (
    layoutKey ??
    (isDisplay ? "" : ADSENSE_IN_FEED_LAYOUT_KEY)
  ).trim()
  const resolvedFullWidthResponsive =
    fullWidthResponsive ?? (isDisplay ? true : undefined)

  useEffect(() => {
    if (!ADSENSE_CLIENT || !normalizedSlot) return

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // Ad blockers and local previews can throw here; the page should continue.
    }
  }, [normalizedSlot])

  if (!ADSENSE_CLIENT || !normalizedSlot) {
    return null
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#e2e8f0] bg-white",
        className,
      )}
      aria-label="Advertisement"
    >
      <Script
        id="google-adsense-script"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
          ADSENSE_CLIENT,
        )}`}
        crossOrigin="anonymous"
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={normalizedSlot}
        data-ad-format={resolvedFormat}
        data-ad-layout-key={normalizedLayoutKey || undefined}
        data-full-width-responsive={
          typeof resolvedFullWidthResponsive === "boolean"
            ? String(resolvedFullWidthResponsive)
            : undefined
        }
      />
    </div>
  )
}

export function GoogleAdsenseDisplayUnit(
  props: Omit<GoogleAdsenseUnitProps, "variant">,
) {
  return <GoogleAdsenseUnit {...props} variant="display" />
}

export default GoogleAdsenseUnit
