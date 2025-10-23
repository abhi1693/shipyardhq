"use client"

import {
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useTransition,
} from "react"
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
  const [current, setCurrent] = useOptimistic(
    rewardEligible,
    (_prev, next: boolean) => next,
  )
  const latestServerValue = useRef(rewardEligible)
  useEffect(() => {
    latestServerValue.current = rewardEligible
  }, [rewardEligible])
  const [isPending, startTransition] = useTransition()

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
    const lastKnown = latestServerValue.current
    if (rewardLocked || lastKnown === nextValue) {
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
        setCurrent(lastKnown)
        return
      }

      latestServerValue.current = nextValue
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
