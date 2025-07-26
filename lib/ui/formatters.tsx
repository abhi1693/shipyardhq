import Link from "next/link"
import { ReactNode } from "react"
import { format } from "date-fns"
import Image from "next/image"

type LinkItem = {
  label?: string
  href: string
  subtext?: ReactNode
  isExternal?: boolean
}

export function linkify({
  label,
  href,
  subtext,
  isExternal = false,
}: LinkItem): ReactNode {
  if (isExternal) {
    try {
      label = new URL(href).hostname || label
    } catch {
      label = label || href
    }
  }

  return (
    <div className="flex flex-col">
      <span key={href} className="inline-flex items-center gap-1">
        <Link
          href={href}
          className="text-blue-600 hover:underline"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {label}
        </Link>
      </span>
      {subtext && <span>{subtext}</span>}
    </div>
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
