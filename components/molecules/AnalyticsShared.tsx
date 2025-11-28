import type { ReactNode } from "react"
import { Laptop, Monitor, MousePointer2, Smartphone, Tablet } from "lucide-react"

import { cn } from "@/lib/utils"

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

const BROWSER_LOGO_VERSION = "75.0.1"
const BROWSER_LOGO_BASE = `https://cdnjs.cloudflare.com/ajax/libs/browser-logos/${BROWSER_LOGO_VERSION}`
const OS_LOGO_VERSION = "1.0.0"
const OS_LOGO_BASE = `https://cdn.jsdelivr.net/npm/operating-system-logos@${OS_LOGO_VERSION}/src/48x48`

type BrowserLogoDefinition = {
  slug: string
  label: string
  matchers: RegExp[]
  assetPath?: string
  assetFile?: string
}

type OsLogoDefinition = {
  label: string
  file: string
  matchers: RegExp[]
}

const BROWSER_LOGOS: BrowserLogoDefinition[] = [
  {
    slug: "chrome",
    label: "Chrome",
    matchers: [/chrome/i, /chromium/i],
  },
  {
    slug: "safari",
    label: "Safari",
    matchers: [/safari/i],
  },
  {
    slug: "firefox",
    label: "Firefox",
    matchers: [/firefox/i],
  },
  {
    slug: "edge",
    label: "Edge",
    matchers: [/edge/i],
  },
  {
    slug: "opera",
    label: "Opera",
    matchers: [/opera/i, /\bopr\b/i],
  },
  {
    slug: "brave",
    label: "Brave",
    matchers: [/brave/i],
  },
  {
    slug: "samsung-internet",
    label: "Samsung Internet",
    matchers: [/samsung/i],
  },
  {
    slug: "internet-explorer",
    label: "Internet Explorer",
    matchers: [/internet explorer/i, /\bie\b/i],
    assetPath:
      "archive/internet-explorer_9-11/internet-explorer_9-11_48x48.png",
  },
  {
    slug: "android-webview",
    label: "Android WebView",
    matchers: [/webview/i],
    assetFile: "android-webview_48x48.png",
  },
]

const OS_LOGOS: OsLogoDefinition[] = [
  {
    label: "macOS",
    file: "mac.png",
    matchers: [/mac/i, /os x/i],
  },
  {
    label: "iOS",
    file: "IOS.png",
    matchers: [/ios/i, /ipad/i, /iphone/i],
  },
  {
    label: "Windows",
    file: "windows.png",
    matchers: [/win/i],
  },
  {
    label: "Android",
    file: "android.png",
    matchers: [/android/i],
  },
  {
    label: "Chrome OS",
    file: "chrome-os.png",
    matchers: [/chrome os/i, /cros/i],
  },
  {
    label: "Linux",
    file: "linux.png",
    matchers: [/linux/i, /ubuntu/i, /debian/i, /fedora/i],
  },
]

function resolveBrowserLogo(name: string): BrowserLogoDefinition | null {
  const normalized = name.trim()
  if (!normalized) return null
  return (
    BROWSER_LOGOS.find((entry) =>
      entry.matchers.some((matcher) => matcher.test(normalized)),
    ) ?? null
  )
}

function resolveOsLogo(name: string): OsLogoDefinition | null {
  const normalized = name.trim()
  if (!normalized) return null
  return (
    OS_LOGOS.find((entry) =>
      entry.matchers.some((matcher) => matcher.test(normalized)),
    ) ?? null
  )
}

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
  const logo = resolveBrowserLogo(name)
  if (!logo) return null

  const relativePath =
    logo.assetPath ??
    `${logo.slug}/${logo.assetFile ? logo.assetFile : `${logo.slug}.svg`}`
  const src = `${BROWSER_LOGO_BASE}/${relativePath}`

  return (
    <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden">
      <img
        src={src}
        alt={`${logo.label} logo`}
        className="h-4 w-4 object-contain"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  )
}

export function OsIcon({ name }: { name: string }) {
  const logo = resolveOsLogo(name)
  if (!logo) return null

  const src = `${OS_LOGO_BASE}/${logo.file}`

  return (
    <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden">
      <img
        src={src}
        alt={`${logo.label} logo`}
        className="h-4 w-4 object-contain"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  )
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
