"use client"

import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { ReactNode } from "react"
import { clickExternalProductLinkAction } from "@/actions/public/products/analytics"
import { cn } from "@/lib/utils"

export function ExternalBadgeLink({
  href,
  children,
  variant,
  productId,
  follow = false,
  target,
  rel,
  className,
}: {
  href: string
  children: ReactNode
  variant?: "default" | "secondary" | "outline"
  // Optional: when provided, use a server action to track and redirect
  productId?: string
  // When true, render a real anchor tag (SEO follow). Otherwise use server action form.
  follow?: boolean
  // Optional anchor attributes when follow=true
  target?: string
  rel?: string
  className?: string
}) {
  const badgeClass = cn("cursor-pointer", className)
  if (!follow && productId) {
    return (
      <form action={clickExternalProductLinkAction} method="post">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="to" value={href} />
        <button type="submit" className="cursor-pointer">
          <Badge variant={variant ?? "default"} className={badgeClass}>
            {children}
          </Badge>
        </button>
      </form>
    )
  }
  return (
    <Link href={href} target={target} rel={rel} className="cursor-pointer">
      <Badge variant={variant ?? "default"} className={badgeClass}>
        {children}
      </Badge>
    </Link>
  )
}

export default ExternalBadgeLink
