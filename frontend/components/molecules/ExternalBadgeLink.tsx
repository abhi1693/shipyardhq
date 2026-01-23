"use client"

import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function ExternalBadgeLink({
  href,
  children,
  variant,
  follow = false,
  target,
  rel,
  className,
}: {
  href: string
  children: ReactNode
  variant?: "default" | "secondary" | "outline"
  follow?: boolean
  target?: string
  rel?: string
  className?: string
}) {
  const badgeClass = cn("cursor-pointer", className)
  const linkTarget = target
  const shouldOpenNewTab = Boolean(linkTarget && linkTarget !== "_self")
  const linkRel =
    rel ??
    (shouldOpenNewTab
      ? follow
        ? "noopener"
        : "noopener noreferrer"
      : undefined)

  return (
    <Link
      href={href}
      target={linkTarget}
      rel={linkRel}
      className="cursor-pointer"
    >
      <Badge variant={variant ?? "default"} className={badgeClass}>
        {children}
      </Badge>
    </Link>
  )
}

export default ExternalBadgeLink
