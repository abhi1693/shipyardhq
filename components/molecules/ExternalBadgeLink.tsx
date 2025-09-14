"use client"

import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { ReactNode } from "react"
import { clickExternalProductLinkAction } from "@/actions/public/products/analytics"

export function ExternalBadgeLink({
  href,
  children,
  variant,
  productId,
}: {
  href: string
  children: ReactNode
  variant?: "default" | "secondary" | "outline"
  // Optional: when provided, use a server action to track and redirect
  productId?: string
}) {
  if (productId) {
    return (
      <form action={clickExternalProductLinkAction} method="post">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="to" value={href} />
        <button type="submit">
          <Badge variant={variant ?? "default"}>{children}</Badge>
        </button>
      </form>
    )
  }
  return (
    <Link href={href}>
      <Badge variant={variant ?? "default"}>{children}</Badge>
    </Link>
  )
}

export default ExternalBadgeLink
