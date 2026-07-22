"use client"

import type { MouseEvent, ReactNode } from "react"

export function ProductWebsiteLink({
  href,
  productSlug,
  trackWithBeacon,
  rel,
  className,
  children,
}: {
  href: string
  productSlug: string
  trackWithBeacon: boolean
  rel: string
  className?: string
  children: ReactNode
}) {
  function trackWebsiteClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!trackWithBeacon || event.defaultPrevented) return

    const endpoint = `/api/products/${encodeURIComponent(productSlug)}/website-click`
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(endpoint)
      return
    }

    void fetch(endpoint, { method: "POST", keepalive: true }).catch(() => {})
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      onClick={trackWebsiteClick}
    >
      {children}
    </a>
  )
}
