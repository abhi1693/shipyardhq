"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/atoms/button"
import FeedbackNudgeDialog from "@/components/molecules/FeedbackNudgeDialog"
import { MEMBER_FEEDBACK_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

const DEFAULT_STORAGE_KEY = "shipyardhq:analytics-feedback-nudge"
const DEFAULT_AUTO_OPEN_DELAY = 30000

export type AnalyticsFeedbackPromptProps = {
  className?: string
  buttonLabel?: string
  feedbackPath?: string
  autoOpenDelayMs?: number
  storageKey?: string
  title?: string
  description?: string
  body?: ReactNode
  primaryLabel?: string
  secondaryLabel?: string
}

export default function AnalyticsFeedbackPrompt({
  className,
  buttonLabel,
  feedbackPath = MEMBER_FEEDBACK_PATH,
  autoOpenDelayMs = DEFAULT_AUTO_OPEN_DELAY,
  storageKey = DEFAULT_STORAGE_KEY,
  title,
  description,
  body,
  primaryLabel,
  secondaryLabel,
}: AnalyticsFeedbackPromptProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const markStatus = useCallback(
    (status: "shown" | "dismissed") => {
      if (typeof window === "undefined") return
      try {
        window.sessionStorage.setItem(storageKey, status)
      } catch {
        // sessionStorage unavailable (private mode); ignore persistence
      }
    },
    [storageKey],
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    let timer: number | null = null
    try {
      const existing = window.sessionStorage.getItem(storageKey)
      if (existing === "dismissed") {
        return
      }
      timer = window.setTimeout(() => {
        setOpen(true)
        markStatus("shown")
      }, autoOpenDelayMs)
    } catch {
      timer = window.setTimeout(() => {
        setOpen(true)
      }, autoOpenDelayMs)
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [autoOpenDelayMs, markStatus, storageKey])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (nextOpen) {
        markStatus("shown")
      } else {
        markStatus("dismissed")
      }
    },
    [markStatus],
  )

  const handleShareFeedback = useCallback(() => {
    markStatus("dismissed")
    setOpen(false)
    router.push(feedbackPath)
  }, [feedbackPath, markStatus, router])

  const handleButtonClick = useCallback(() => {
    setOpen(true)
    markStatus("shown")
  }, [markStatus])

  const resolvedButtonLabel = buttonLabel ?? "Share feedback"
  const resolvedTitle = title ?? "Help us improve these insights"
  const resolvedDescription =
    description ??
    "We ship new analytics weekly. Tell us what data would make this dashboard more useful."
  const resolvedBody =
    body ??
    "Flag confusing trends, missing metrics, or the decisions you want to make faster."
  const resolvedPrimaryLabel = primaryLabel ?? "Open feedback form"
  const resolvedSecondaryLabel = secondaryLabel ?? "Maybe later"

  return (
    <div className={cn("flex items-center justify-end", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleButtonClick}
        className="gap-1"
      >
        {resolvedButtonLabel}
      </Button>

      <FeedbackNudgeDialog
        open={open}
        onOpenChange={handleOpenChange}
        onAddMore={handleShareFeedback}
        title={resolvedTitle}
        description={resolvedDescription}
        body={resolvedBody}
        primaryLabel={resolvedPrimaryLabel}
        secondaryLabel={resolvedSecondaryLabel}
      />
    </div>
  )
}
