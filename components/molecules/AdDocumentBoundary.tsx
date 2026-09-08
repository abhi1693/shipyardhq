"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import {
  handleAdDocumentClick,
  reloadAdDocumentIfNeeded,
} from "@/lib/ads/document"

export function AdDocumentBoundary() {
  const pathname = usePathname()

  useEffect(() => {
    reloadAdDocumentIfNeeded()
  }, [pathname])

  useEffect(() => {
    document.addEventListener("click", handleAdDocumentClick, true)
    return () =>
      document.removeEventListener("click", handleAdDocumentClick, true)
  }, [])

  return null
}
