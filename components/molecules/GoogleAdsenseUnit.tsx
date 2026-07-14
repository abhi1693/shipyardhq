"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"

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
  const adRef = useRef<HTMLModElement | null>(null)
  const isDisplay = variant === "display"
  const normalizedSlot = (
    slot ?? (isDisplay ? ADSENSE_DISPLAY_SLOT : ADSENSE_IN_FEED_SLOT)
  ).trim()
  const resolvedFormat = format ?? (isDisplay ? "auto" : "fluid")
  const normalizedLayoutKey = (
    layoutKey ?? (isDisplay ? "" : ADSENSE_IN_FEED_LAYOUT_KEY)
  ).trim()
  const resolvedFullWidthResponsive =
    fullWidthResponsive ?? (isDisplay ? true : undefined)
  const adIdentity = useMemo(
    () =>
      [
        variant,
        normalizedSlot,
        resolvedFormat,
        normalizedLayoutKey,
        resolvedFullWidthResponsive,
      ].join(":"),
    [
      normalizedLayoutKey,
      normalizedSlot,
      resolvedFormat,
      resolvedFullWidthResponsive,
      variant,
    ],
  )

  useEffect(() => {
    if (!ADSENSE_CLIENT || !normalizedSlot) return
    const adElement = adRef.current
    if (!adElement) return
    if (
      adElement.dataset.adsbygooglePushed === "true" ||
      adElement.dataset.adStatus
    ) {
      return
    }

    try {
      const scriptSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        ADSENSE_CLIENT,
      )}`
      const scriptId = "google-adsense-script"
      const existingScript = document.getElementById(scriptId)

      if (!existingScript) {
        const script = document.createElement("script")
        script.id = scriptId
        script.async = true
        script.src = scriptSrc
        script.crossOrigin = "anonymous"
        document.head.appendChild(script)
      }

      window.adsbygoogle = window.adsbygoogle || []
      adElement.dataset.adsbygooglePushed = "true"
      window.adsbygoogle.push({})
    } catch {
      // Ad blockers and local previews can throw here; the page should continue.
    }
  }, [adIdentity, normalizedSlot])

  if (!ADSENSE_CLIENT || !normalizedSlot) {
    return null
  }

  return (
    <div
      className={cn("shipyard-adsense-unit overflow-hidden", className)}
      aria-label="Advertisement"
    >
      <ins
        key={adIdentity}
        ref={adRef}
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
