"use client"

import { useMemo, useRef, useState, useSyncExternalStore } from "react"
import { X } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"
import { parseKeywords } from "@/lib/productWizard/transform"

const RECENT_KEY = "shipyard:product-wizard:recent-keywords"
const RECENT_EVENT = "shipyard:recent-keywords"

function normalizeKeyword(raw: string) {
  const trimmed = raw.trim().replace(/\s+/g, " ")
  return trimmed.length ? trimmed.toLowerCase() : ""
}

function toKeywordsText(keywords: string[]) {
  return keywords.join(", ")
}

function readRecentKeywords(): string[] {
  try {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v) => typeof v === "string")
      .map((v) => normalizeKeyword(v))
      .filter(Boolean)
  } catch {
    return []
  }
}

function writeRecentKeywords(keywords: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(keywords))
    window.dispatchEvent(new Event(RECENT_EVENT))
  } catch {}
}

export function KeywordsInput({
  value,
  onChange,
  onBlur,
  placeholder = "Type a keyword and press Enter",
  maxKeywords = 10,
  maxKeywordLength = 32,
  suggestions = [
    "ai",
    "analytics",
    "automation",
    "billing",
    "crm",
    "customer support",
    "design",
    "developer tools",
    "email",
    "finance",
    "marketing",
    "monitoring",
    "no-code",
    "payments",
    "productivity",
    "security",
    "seo",
    "social",
  ],
  className,
}: {
  value?: string
  onChange: (next: string) => void
  onBlur?: () => void
  placeholder?: string
  maxKeywords?: number
  maxKeywordLength?: number
  suggestions?: readonly string[]
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const keywords = useMemo(() => parseKeywords(value), [value])

  const recentRaw = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {}
      const onStorage = (e: StorageEvent) => {
        if (!e.key || e.key === RECENT_KEY) callback()
      }
      const onLocal = () => callback()
      window.addEventListener("storage", onStorage)
      window.addEventListener(RECENT_EVENT, onLocal)
      return () => {
        window.removeEventListener("storage", onStorage)
        window.removeEventListener(RECENT_EVENT, onLocal)
      }
    },
    () => (typeof window === "undefined" ? "" : window.localStorage.getItem(RECENT_KEY) || ""),
    () => "",
  )

  const recent = useMemo(() => {
    try {
      const parsed = JSON.parse(recentRaw || "[]")
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((v) => typeof v === "string")
        .map((v) => normalizeKeyword(v))
        .filter(Boolean)
    } catch {
      return []
    }
  }, [recentRaw])

  const canAddMore = keywords.length < maxKeywords
  const suggestionOptions = useMemo(() => {
    const selected = new Set(keywords)
    const base = Array.from(
      new Set([...recent, ...suggestions.map((s) => normalizeKeyword(s))]),
    ).filter(Boolean)

    const q = normalizeKeyword(draft)
    const filtered = q.length
      ? base.filter((k) => k.includes(q))
      : base

    return filtered.filter((k) => !selected.has(k)).slice(0, 24)
  }, [draft, keywords, recent, suggestions])

  function commitKeywords(nextKeywords: string[]) {
    const deduped = Array.from(new Set(nextKeywords.map(normalizeKeyword)))
      .filter(Boolean)
      .slice(0, maxKeywords)
    onChange(toKeywordsText(deduped))

    const stored = readRecentKeywords()
    const nextRecent = Array.from(new Set([...deduped, ...stored])).slice(0, 20)
    writeRecentKeywords(nextRecent)
  }

  function addFromString(input: string) {
    setLocalError(null)
    const parts = input
      .split(/[,|\n]/g)
      .map((p) => normalizeKeyword(p))
      .filter(Boolean)

    if (!parts.length) return
    if (!canAddMore) {
      setLocalError(`Up to ${maxKeywords} keywords.`)
      return
    }

    const tooLong = parts.find((p) => p.length > maxKeywordLength)
    if (tooLong) {
      setLocalError(`"${tooLong}" is too long (max ${maxKeywordLength}).`)
      return
    }

    const next = [...keywords, ...parts]
    commitKeywords(next)
    setDraft("")
  }

  function removeKeyword(keyword: string) {
    setLocalError(null)
    commitKeywords(keywords.filter((k) => k !== keyword))
  }

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Recommended: 3–8 keywords
        </div>
        <div className="text-xs text-muted-foreground">
          {keywords.length}/{maxKeywords}
        </div>
      </div>

      {keywords.length ? (
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => (
            <button
              key={k}
              type="button"
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border bg-muted/20 px-3 py-1 text-xs text-foreground hover:bg-muted/40"
              onClick={() => removeKeyword(k)}
              title="Remove"
            >
              <span className="max-w-[14rem] truncate">{k}</span>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          if (localError) setLocalError(null)
        }}
        onBlur={(e) => {
          const nextFocus =
            e.relatedTarget && e.relatedTarget instanceof Node
              ? e.relatedTarget
              : null
          if (nextFocus && rootRef.current?.contains(nextFocus)) {
            return
          }
          if (draft.trim().length) addFromString(draft)
          onBlur?.()
        }}
        placeholder={placeholder}
        disabled={!canAddMore}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addFromString(draft)
            return
          }
          if (e.key === "Backspace" && !draft.length && keywords.length) {
            e.preventDefault()
            removeKeyword(keywords[keywords.length - 1])
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData?.getData("text/plain")
          if (!text) return
          if (!/[,\n]/.test(text)) return
          e.preventDefault()
          addFromString(text)
        }}
      />

      {localError ? (
        <div className="text-sm text-destructive">{localError}</div>
      ) : null}

      {suggestionOptions.length ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {suggestionOptions.map((s) => (
            <button
              key={s}
              type="button"
              className="inline-flex cursor-pointer items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              onClick={() => addFromString(s)}
              disabled={!canAddMore}
              title="Add"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
