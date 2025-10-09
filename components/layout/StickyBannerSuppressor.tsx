"use client"

import { useId, useLayoutEffect } from "react"

import { useStickyBannerContext } from "@/components/layout/sticky-banner-context"

type StickyBannerSuppressorProps = {
  priority?: number
}

export function StickyBannerSuppressor({
  priority = Number.MAX_SAFE_INTEGER,
}: StickyBannerSuppressorProps) {
  const { registerRegion, unregisterRegion, activeRegionId } =
    useStickyBannerContext()
  const id = useId()

  useLayoutEffect(() => {
    registerRegion(id, priority)
    return () => {
      unregisterRegion(id)
    }
  }, [id, priority, registerRegion, unregisterRegion])

  return activeRegionId === id ? null : null
}

export default StickyBannerSuppressor
