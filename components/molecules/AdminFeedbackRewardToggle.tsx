"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { updateFeedbackRewardEligibility } from "@/actions/admin/feedback/actions"
import { Switch } from "@/components/atoms/switch"

type AdminFeedbackRewardToggleProps = {
  feedbackId: string
  rewardEligible: boolean
  rewardGrantedAt: Date | string | null
}

export default function AdminFeedbackRewardToggle({
  feedbackId,
  rewardEligible,
  rewardGrantedAt,
}: AdminFeedbackRewardToggleProps) {
  const controlId = useId()
  const [current, setCurrent] = useState(rewardEligible)
  const previous = useRef(rewardEligible)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setCurrent(rewardEligible)
    previous.current = rewardEligible
  }, [rewardEligible])

  const rewardTimestamp =
    typeof rewardGrantedAt === "string"
      ? new Date(rewardGrantedAt)
      : rewardGrantedAt

  const validRewardTimestamp =
    rewardTimestamp && !Number.isNaN(rewardTimestamp.getTime())
      ? rewardTimestamp
      : null

  const rewardLocked = Boolean(rewardGrantedAt)
  const switchHint = rewardLocked
    ? validRewardTimestamp
      ? `Rewards granted ${formatDistanceToNow(validRewardTimestamp, {
          addSuffix: true,
        })}`
      : "Rewards already granted"
    : current
      ? "Rewards will trigger when closed."
      : "Rewards disabled."

  const handleChange = (nextValue: boolean) => {
    if (rewardLocked || previous.current === nextValue) {
      return
    }

    setCurrent(nextValue)

    startTransition(async () => {
      const result = await updateFeedbackRewardEligibility({
        id: feedbackId,
        rewardEligible: nextValue,
      })

      if (result?.error) {
        toast.error(result.error)
        setCurrent(previous.current)
        return
      }

      previous.current = nextValue
      toast.success(
        nextValue
          ? "Feedback marked as reward eligible."
          : "Feedback rewards disabled.",
      )
    })
  }

  return (
    <div className="flex items-center justify-center">
      <Switch
        id={controlId}
        aria-label="Reward on close"
        checked={current}
        onCheckedChange={handleChange}
        disabled={isPending || rewardLocked}
        title={switchHint}
      />
    </div>
  )
}
