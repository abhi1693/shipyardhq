"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

type JsonPreviewProps = {
  value: unknown
  className?: string
  maxHeight?: number
}

function JsonPreviewComponent({
  value,
  className,
  maxHeight = 320,
}: JsonPreviewProps) {
  return (
    <pre
      className={cn(
        "w-full overflow-auto rounded-lg bg-slate-950/95 p-4 text-xs leading-relaxed text-slate-100 shadow-inner",
        className,
      )}
      style={{ maxHeight }}
    >
      {formatJson(value)}
    </pre>
  )
}

export const JsonPreview = memo(JsonPreviewComponent)
