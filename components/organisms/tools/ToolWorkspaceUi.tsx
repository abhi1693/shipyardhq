"use client"

import type { ReactNode } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/atoms/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import CopyButton from "@/components/molecules/CopyButton"
import { cn } from "@/lib/utils"

type StatusTone = "good" | "warning" | "neutral" | "danger"

const statusStyles: Record<StatusTone, string> = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  danger: "border-red-200 bg-red-50 text-red-800",
}

export function ToolWorkspaceGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ToolPanel({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const headingId = `${id}-heading`

  return (
    <Card
      className={cn(
        "min-w-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white py-0 shadow-sm",
        className,
      )}
    >
      <CardHeader className="gap-2 border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-base">
              <h3 id={headingId} className="text-balance">
                {title}
              </h3>
            </CardTitle>
            {description ? (
              <CardDescription className="text-pretty leading-5">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent
        role="region"
        aria-labelledby={headingId}
        className="p-5 sm:p-6"
      >
        {children}
      </CardContent>
    </Card>
  )
}

export function ToolField({
  htmlFor,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  htmlFor: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-900">
          {label}
          {required ? (
            <>
              <span className="ml-1 text-red-600" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-pretty text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ToolStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: StatusTone
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        statusStyles[tone],
      )}
    >
      {children}
    </span>
  )
}

export function ToolMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: ReactNode
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-pretty text-xs leading-4 text-slate-500">
          {detail}
        </p>
      ) : null}
    </div>
  )
}

export function CopyTextButton({
  text,
  label = "Copy",
  disabled,
}: {
  text: string
  label?: string
  disabled?: boolean
}) {
  return <CopyButton text={text} label={label} disabled={disabled || !text} />
}

export function DownloadTextButton({
  content,
  filename,
  label = "Download",
  mimeType = "text/plain;charset=utf-8",
  disabled,
}: {
  content: string
  filename: string
  label?: string
  mimeType?: string
  disabled?: boolean
}) {
  function download() {
    if (!content || disabled) return

    const blob = new Blob([content], { type: mimeType })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = href
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={download}
      disabled={disabled || !content}
    >
      <Download aria-hidden="true" />
      {label}
    </Button>
  )
}

export function ToolEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-pretty text-sm leading-5 text-slate-600">
        {description}
      </p>
    </div>
  )
}

export function CopyableCode({
  code,
  label,
  showHeader = true,
}: {
  code: string
  label: string
  showHeader?: boolean
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {showHeader ? (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2">
          <span className="font-mono text-xs text-slate-300">{label}</span>
          <CopyTextButton text={code} label={`Copy ${label}`} />
        </div>
      ) : null}
      <pre
        tabIndex={0}
        aria-label={`${label} code`}
        className="max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6 text-slate-100 [overflow-wrap:anywhere] sm:p-5"
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}
