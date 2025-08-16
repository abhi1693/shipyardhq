import Link from "next/link"
import { Badge } from "@/components/atoms/badge"
import { ReactNode } from "react"

export function ExternalBadgeLink({
  href,
  children,
  variant,
  target,
  rel,
}: {
  href: string
  children: ReactNode
  variant?: "default" | "secondary" | "outline"
  target?: string
  rel?: string
}) {
  return (
    <Link href={href} target={target} rel={rel}
    >
      <Badge variant={variant ?? "default"}>{children}</Badge>
    </Link>
  )
}

export default ExternalBadgeLink
