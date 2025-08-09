"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"

export function useBreadcrumbs() {
  const pathname = usePathname()

  return useMemo(() => {
    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split("/").filter(Boolean)
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path,
      }
    })
  }, [pathname])
}
