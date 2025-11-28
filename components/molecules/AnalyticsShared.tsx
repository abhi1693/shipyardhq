import type { ReactNode } from "react"
import {
  Globe2,
  Laptop,
  Monitor,
  MousePointer2,
  Smartphone,
  Tablet,
} from "lucide-react"

import { cn } from "@/lib/utils"

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

export function formatDuration(
  seconds: number,
  options?: { padMinutes?: boolean },
) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const paddedMinutes =
    options?.padMinutes === true
      ? minutes.toString().padStart(2, "0")
      : minutes.toString()

  if (hours > 0) {
    return `${hours}h ${paddedMinutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`
  }
  return `${secs}s`
}

export function formatPercent(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  if (!Number.isFinite(value)) return "—"
  const formatter =
    options != null
      ? new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 1,
          ...options,
        })
      : percentFormatter
  return `${formatter.format(value)}%`
}

export function flagEmoji(code?: string | null) {
  if (!code || code.length !== 2) return "🌐"
  const upper = code.toUpperCase()
  const first = upper.codePointAt(0)
  const second = upper.codePointAt(1)
  if (!first || !second) return "🌐"
  return String.fromCodePoint(
    0x1f1e6 + (first - 65),
    0x1f1e6 + (second - 65),
  )
}

export function FlagIcon({
  code,
  name,
  variant = "emoji",
  className,
}: {
  code?: string | null
  name: string
  variant?: "emoji" | "image"
  className?: string
}) {
  if (variant === "image" && code && code.length === 2) {
    const lower = code.toLowerCase()
    return (
      <span
        className={cn(
          "inline-flex h-4 w-6 overflow-hidden rounded-sm ring-1 ring-slate-200/80",
          className,
        )}
      >
        <img
          src={`https://flagcdn.com/w40/${lower}.png`}
          alt={`${name} flag`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </span>
    )
  }

  const emoji = flagEmoji(code)
  return (
    <span className={cn("text-lg", className)} title={name} aria-label={name}>
      {emoji}
    </span>
  )
}

export function BrowserIcon({ name }: { name: string }) {
  const key = name.toLowerCase()
  if (key.includes("chrome")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" fill="#ea4335" />
        <path d="M12 12 6 6a10 10 0 0 1 12 2" fill="#fbbc04" />
        <path d="M12 12 6 18a10 10 0 0 1-1-12" fill="#34a853" />
        <circle cx="12" cy="12" r="4" fill="#fff" />
        <circle cx="12" cy="12" r="2.6" fill="#4285f4" />
      </svg>
    )
  }
  if (key.includes("safari")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" fill="#0ea5e9" />
        <polygon points="12,5 9,15 12,12 15,9" fill="#fff" />
        <polygon points="12,19 15,9 12,12 9,15" fill="#f43f5e" />
      </svg>
    )
  }
  if (key.includes("firefox")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M12 2c5.5 0 9.5 4.3 9 9.5-.5 5.2-5 8.5-9.7 8.5-5 0-8.9-3.7-8.9-8.5C2.4 8.2 5 5 8 4c-.2.7-.2 1.7.4 2.5 1.2-1.3 2.8-1.9 4.8-1.9Z"
          fill="#f97316"
        />
        <path d="M9 7c-.4 1.4.3 2.6 1.6 3 1.7.6 3.5-.6 3.6-2.4" fill="#fbbf24" />
      </svg>
    )
  }
  if (key.includes("edge")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M4 15c0-5.5 6.5-9.5 12-6.6-.7-.2-1.6-.2-2.5.3C11 10.5 10.2 14 12 16c-3 0-5-.5-5-3Z"
          fill="#0ea5e9"
        />
        <path d="M12 16c0 2.5 2.2 4 4.5 4 2.3 0 3.8-1.3 4.5-3.5" fill="#22c55e" />
      </svg>
    )
  }
  if (key.includes("opera")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <circle cx="12" cy="12" r="10" fill="#e60023" />
        <ellipse cx="12" cy="12" rx="4" ry="7" fill="#fff" />
      </svg>
    )
  }
  if (key.includes("brave")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M6 4 4 7l2 9 6 4 6-4 2-9-2-3H6Z"
          fill="#f97316"
          stroke="#ea580c"
          strokeWidth="0.5"
        />
      </svg>
    )
  }
  return <Globe2 className="h-4 w-4 text-slate-400" />
}

export function OsIcon({ name }: { name: string }) {
  const key = name.toLowerCase()
  if (key.includes("mac") || key.includes("ios")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M16 2s-1.5.1-2.6 1.6C12.4 5 12.7 6 13 6.5c.4.4 1.2 1.2 2.4 1 0 0 .1-1.5 1.2-2.7C17.7 3.6 18.7 3 19.4 3c0 0-.4-1-1.8-1-.9 0-1.6.4-1.6.4Z"
          fill="#0f172a"
        />
        <path
          d="M12.5 7.8C11 7 9.4 7.2 8.2 7.8 6.6 8.6 6 10.4 6 11.6c0 1.6.6 3 1.2 4 .8 1.4 1.6 2.4 2.8 2.4 1 0 1.5-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.2 0 2-.9 2.8-2.3.6-1.1 1-2.3 1-3.2a4.4 4.4 0 0 0-2.2-3.7c-1.4-.8-3-.7-3.7-.3-.3.2-.7.4-1.1.4-.3 0-.7-.2-1-.4Z"
          fill="#0f172a"
        />
      </svg>
    )
  }
  if (key.includes("windows")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path d="M3 4.5 11 3v8H3v-6.5Z" fill="#2563eb" />
        <path d="M3 12.5h8v8l-8-1.1v-6.9Z" fill="#2563eb" />
        <path d="M13 3.2 21 2v9h-8V3.2Z" fill="#2563eb" />
        <path d="M13 12.8h8V22l-8-1.2v-8Z" fill="#2563eb" />
      </svg>
    )
  }
  if (key.includes("android")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <rect x="6" y="7" width="12" height="10" rx="2" fill="#16a34a" />
        <circle cx="10" cy="10" r="0.8" fill="#fff" />
        <circle cx="14" cy="10" r="0.8" fill="#fff" />
      </svg>
    )
  }
  if (key.includes("linux")) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M9 5c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v10H9V5Z"
          fill="#0f172a"
        />
        <path d="M8 15h8l-1 3H9l-1-3Z" fill="#f59e0b" />
      </svg>
    )
  }
  return <Laptop className="h-4 w-4 text-slate-400" />
}

export function deviceIcon(deviceCategory: string) {
  const key = deviceCategory.toLowerCase()
  if (key.includes("desktop")) return <Monitor className="h-4 w-4 text-slate-400" />
  if (key.includes("mobile")) return <Smartphone className="h-4 w-4 text-slate-400" />
  if (key.includes("tablet")) return <Tablet className="h-4 w-4 text-slate-400" />
  return <MousePointer2 className="h-4 w-4 text-slate-400" />
}

export function ValueBarRow({
  value,
  max,
  left,
  right,
  tone = "blue",
  minPercent = 0,
  className,
  barClassName,
}: {
  value: number
  max: number
  left: ReactNode
  right?: ReactNode
  tone?: "blue" | "indigo"
  minPercent?: number
  className?: string
  barClassName?: string
}) {
  const safeMax = max > 0 ? max : value || 1
  const pct = Math.min(100, Math.max(minPercent, (value / safeMax) * 100))
  const barColor = tone === "indigo" ? "bg-indigo-200" : "bg-sky-200"

  return (
    <div
      className={cn("relative overflow-hidden rounded-md px-3 py-2", className)}
    >
      <div
        className={cn("absolute inset-y-0 left-0", barColor, barClassName)}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 truncate">{left}</div>
        {right ? <div className="shrink-0 text-right">{right}</div> : null}
      </div>
    </div>
  )
}
