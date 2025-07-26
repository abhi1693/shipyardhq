import Link from "next/link"
import { ReactNode } from "react"
import { format } from "date-fns"
import Image from "next/image"
import { Badge } from "@/components/atoms/badge"
import { formatDistanceToNow as fdn } from "date-fns"

type LinkItem = {
  label?: string
  href: string
  subtext?: ReactNode
  isExternal?: boolean
}

export function linkify(item: LinkItem): ReactNode {
  if (item.isExternal) {
    try {
      item.label = new URL(item.href).hostname || item.label
    } catch {
      item.label = item.label || item.href
    }
  }

  return (
    <span key={item.href} className="inline-block align-top">
      <Link
        href={item.href}
        className="text-blue-600 hover:underline"
        target={item.isExternal ? "_blank" : undefined}
        rel={item.isExternal ? "noopener noreferrer" : undefined}
      >
        {item.label}
      </Link>
      {item.subtext && (
        <div className="text-xs text-muted-foreground leading-snug">
          {item.subtext}
        </div>
      )}
    </span>
  )
}

export function placeholder() {
  return <span className="text-sm text-muted-foreground">—</span>
}

export function commaSeparated(values: ReactNode[]): ReactNode {
  if (values.length) {
    return (
      <span className="inline text-sm text-muted-foreground">
        {values.map((val, i) => (
          <span key={i} className="inline">
            {val}
            {i < values.length - 1 && <>, </>}
          </span>
        ))}
      </span>
    )
  } else {
    return placeholder()
  }
}

export function formatDate(
  value: Date | string,
  pattern = "yyyy-MM-dd HH:mm",
): ReactNode {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  return (
    <span className="text-muted-foreground text-sm">
      {format(date, pattern)}
    </span>
  )
}

export function slug(value: string): ReactNode {
  return (
    <span className="font-mono text-muted-foreground text-sm">{value}</span>
  )
}

export function image(src: string, alt: string, width = 32, height = 32) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="rounded bg-white border object-contain"
    />
  )
}

export function formatBoolean(
  value: boolean | undefined,
  trueLabel: string = "Yes",
  falseLabel: string = "No",
): ReactNode {
  if (value === undefined) return placeholder()
  return (
    <Badge variant={value ? "success" : "destructive"}>
      {value ? trueLabel : falseLabel}
    </Badge>
  )
}

export function formatCurrency(value: number): ReactNode {
  if (value === null || value === undefined) {
    return placeholder()
  }
  return (
    <span className="text-sm text-muted-foreground">
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value / 100)}
    </span>
  )
}

export function formatDistanceToNow(
  value: Date | string | undefined,
): ReactNode {
  if (!value) return placeholder()
  const date = typeof value === "string" ? new Date(value) : value
  const distance = fdn(date, { addSuffix: true })
  return <span className="text-sm text-muted-foreground">{distance}</span>
}
