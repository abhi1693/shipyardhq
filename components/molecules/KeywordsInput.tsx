"use client"

import { useMemo, useRef, useState } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { parseKeywords } from "@/lib/productWizard/transform"

function normalizeKeyword(raw: string) {
  const trimmed = raw.trim().replace(/\s+/g, " ")
  return trimmed.length ? trimmed.toLowerCase() : ""
}

function toKeywordsText(keywords: string[]) {
  return keywords.join(", ")
}

export function KeywordsInput({
  value,
  onChange,
  onBlur,
  placeholder = "Type a keyword and press Enter",
  maxKeywords = 10,
  maxKeywordLength = 32,
  className,
}: {
  value?: string
  onChange: (next: string) => void
  onBlur?: () => void
  placeholder?: string
  maxKeywords?: number
  maxKeywordLength?: number
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const keywords = useMemo(() => parseKeywords(value), [value])

  const canAddMore = keywords.length < maxKeywords

  function commitKeywords(nextKeywords: string[]) {
    const deduped = Array.from(new Set(nextKeywords.map(normalizeKeyword)))
      .filter(Boolean)
      .slice(0, maxKeywords)
    onChange(toKeywordsText(deduped))
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
      <div className="flex items-center justify-end gap-2">
        <div className="text-xs text-muted-foreground">
          {keywords.length}/{maxKeywords}
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-12 w-full cursor-text flex-wrap items-center gap-2 rounded-lg border border-[#C4C6CD] bg-white px-3 py-2 text-sm text-[#0b1c30] shadow-none transition-colors hover:bg-[#F8FAFC] focus-within:border-[#0051d5] focus-within:ring-2 focus-within:ring-[#0051d5]/25",
          !canAddMore && "bg-[#F8FAFC]",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {keywords.map((k) => (
          <button
            key={k}
            type="button"
            className="inline-flex max-w-[14rem] cursor-pointer items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium leading-none text-[#0b1c30] hover:bg-[#eff4ff]"
            onClick={(e) => {
              e.stopPropagation()
              removeKeyword(k)
            }}
            title="Remove"
          >
            <span className="truncate">{k}</span>
            <X className="h-3.5 w-3.5 shrink-0 text-[#74777d]" />
          </button>
        ))}

        <input
          ref={inputRef}
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
          placeholder={keywords.length ? "" : placeholder}
          disabled={!canAddMore}
          className="h-7 min-w-[12rem] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[#74777d] disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>

      {localError ? (
        <div className="text-sm text-destructive">{localError}</div>
      ) : null}
    </div>
  )
}
