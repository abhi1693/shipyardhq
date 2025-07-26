import Link from "next/link"
import { ReactNode } from "react"

type LinkItem = {
  label: string
  href: string
  suffix?: ReactNode
}

export function linkify(item: LinkItem): ReactNode {
  return (
    <span key={item.href} className="inline-flex items-center gap-1">
      <Link href={item.href} className="text-blue-600 hover:underline">
        {item.label}
      </Link>
      {item.suffix && <span>{item.suffix}</span>}
    </span>
  )
}

export function commaSeparated(values: ReactNode[]): ReactNode {
  return values.map((val, i) => (
    <span key={i}>
      {val}
      {i < values.length - 1 && <span>, </span>}
    </span>
  ))
}
