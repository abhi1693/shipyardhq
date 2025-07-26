import Link from "next/link"
import { ReactNode } from "react"
import { format } from "date-fns"

type LinkItem = {
  label: string
  href: string
  suffix?: ReactNode
}

export function linkify({ label, href, suffix }: LinkItem): ReactNode {
  return (
    <span key={href} className="inline-flex items-center gap-1">
      <Link href={href} className="text-blue-600 hover:underline font-medium">
        {label}
      </Link>
      {suffix && <span>{suffix}</span>}
    </span>
  )
}

export function commaSeparated(values: ReactNode[]): ReactNode {
  return (
    <>
      {values.map((val, i) => (
        <span key={i}>
          {val}
          {i < values.length - 1 && <span>, </span>}
        </span>
      ))}
    </>
  )
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
