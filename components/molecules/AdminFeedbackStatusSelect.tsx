"use client"

import { useTransition, useState, useEffect, useRef } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { updateFeedbackStatus } from "@/actions/admin/feedback/actions"
import { FeedbackStatus } from "@/lib/vendor/prisma/client"
import { toast } from "sonner"

const STATUS_OPTIONS: Array<{ label: string; value: FeedbackStatus }> = [
  { label: "Received", value: "received" },
  { label: "In review", value: "in_review" },
  { label: "Closed", value: "closed" },
]

const STATUS_MESSAGES: Record<FeedbackStatus, string> = {
  received: "Marked feedback as received.",
  in_review: "Marked feedback as in review.",
  closed: "Marked feedback as closed.",
}

export default function AdminFeedbackStatusSelect({
  feedbackId,
  status,
}: {
  feedbackId: string
  status: FeedbackStatus
}) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const previousStatus = useRef(status)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setCurrentStatus(status)
    previousStatus.current = status
  }, [status])

  function handleChange(nextValue: string) {
    const nextStatus = nextValue as FeedbackStatus
    const lastStatus = previousStatus.current

    if (nextStatus === lastStatus) return

    setCurrentStatus(nextStatus)

    startTransition(async () => {
      const result = await updateFeedbackStatus({
        id: feedbackId,
        status: nextStatus,
      })

      if (result?.error) {
        toast.error(result.error)
        setCurrentStatus(lastStatus)
        return
      }

      previousStatus.current = nextStatus
      toast.success(STATUS_MESSAGES[nextStatus] ?? "Status updated.")
    })
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger
        disabled={isPending}
        className="h-8 min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-foreground"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
