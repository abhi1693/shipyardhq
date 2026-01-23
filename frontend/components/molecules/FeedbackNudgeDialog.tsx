"use client"

import { useCallback, type ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Button } from "@/components/atoms/button"

export type FeedbackNudgeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMore: () => void
  title?: string
  description?: string
  body?: ReactNode
  primaryLabel?: string
  secondaryLabel?: string
}

export default function FeedbackNudgeDialog({
  open,
  onOpenChange,
  onAddMore,
  title,
  description,
  body,
  primaryLabel,
  secondaryLabel,
}: FeedbackNudgeDialogProps) {
  const handleShareMore = useCallback(() => {
    onAddMore()
    onOpenChange(false)
  }, [onAddMore, onOpenChange])

  const handleDismiss = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const heading = title ?? "Have a few more thoughts?"
  const supporting =
    description ??
    "We read every note. Extra context helps the team ship improvements faster."
  const bodyContent = body ?? (
    <p className="text-sm leading-relaxed text-slate-700">
      Tell us what&apos;s working, what&apos;s confusing, or what still feels
      missing. Another quick entry keeps Shipyard evolving with your team.
    </p>
  )
  const primaryText = primaryLabel ?? "Share another idea"
  const secondaryText = secondaryLabel ?? "Maybe later"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{supporting}</DialogDescription>
        </DialogHeader>

        {typeof bodyContent === "string" ? (
          <p className="text-sm leading-relaxed text-slate-700">
            {bodyContent}
          </p>
        ) : (
          bodyContent
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDismiss}>
            {secondaryText}
          </Button>
          <Button type="button" onClick={handleShareMore}>
            {primaryText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
