"use client"

import { useEffect, useRef, useState } from "react"

import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"

export const BADGE_CELEBRATION_EVENT = "shipyard:badge-celebration:open"
const CELEBRATE_QUERY_KEY = "celebrate"
const CELEBRATE_QUERY_VALUE = "1"

export default function ProductBadgeCelebrationGate({
  initialOpen,
  productPublicPath,
}: {
  initialOpen: boolean
  productPublicPath?: string
}) {
  const [open, setOpen] = useState(initialOpen)
  const shouldCleanQuery = useRef(initialOpen)

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOpenRequest = () => {
      setOpen(true)
    }

    window.addEventListener(BADGE_CELEBRATION_EVENT, handleOpenRequest)
    return () => {
      window.removeEventListener(BADGE_CELEBRATION_EVENT, handleOpenRequest)
    }
  }, [])

  useEffect(() => {
    if (!open || typeof window === "undefined") return

    const url = new URL(window.location.href)
    if (url.searchParams.get(CELEBRATE_QUERY_KEY) !== CELEBRATE_QUERY_VALUE) {
      url.searchParams.set(CELEBRATE_QUERY_KEY, CELEBRATE_QUERY_VALUE)
      window.history.replaceState(null, "", url.toString())
    }
    shouldCleanQuery.current = true
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (
      !nextOpen &&
      typeof window !== "undefined" &&
      shouldCleanQuery.current
    ) {
      const url = new URL(window.location.href)
      if (url.searchParams.has(CELEBRATE_QUERY_KEY)) {
        url.searchParams.delete(CELEBRATE_QUERY_KEY)
        window.history.replaceState(null, "", url.toString())
      }
      shouldCleanQuery.current = false
    }
  }

  if (!open) return null

  return (
    <ProductBadgeCelebrationDialog
      open={open}
      onOpenChange={handleOpenChange}
      productPublicPath={productPublicPath}
    />
  )
}
