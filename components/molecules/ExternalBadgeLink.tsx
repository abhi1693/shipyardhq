import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { ReactNode } from "react"

export function ExternalBadgeLink({
  href,
  children,
  variant,
  target,
}: {
  href: string
  children: ReactNode
  variant?: "default" | "secondary" | "outline"
  target?: string
}) {
  return (
    <Link href={href} target={target}>
      <Badge variant={variant ?? "default"}>{children}</Badge>
    </Link>
  )
}

export default ExternalBadgeLink
