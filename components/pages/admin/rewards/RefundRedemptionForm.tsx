"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

import { refundRedemptionAction } from "@/actions/admin/rewards/actions"
import {
  initialRefundRewardsState,
  type RefundRewardsFormState,
} from "@/actions/admin/rewards/form-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Label } from "@/components/atoms/label"
import { Textarea } from "@/components/atoms/textarea"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"
import type { RedemptionStatus } from "@/lib/vendor/prisma/client"
import { Switch } from "@/components/atoms/switch"

const statusLabels: Record<RedemptionStatus, string> = {
  pending: "Pending",
  active: "Active",
  expired: "Expired",
  canceled: "Canceled",
  failed: "Failed",
  refunded: "Refunded",
}

const statusVariants: Record<RedemptionStatus, string> = {
  pending: "secondary",
  active: "default",
  expired: "outline",
  canceled: "outline",
  failed: "destructive",
  refunded: "success",
}

type RefundableRedemption = {
  id: string
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  featureKey: string
  rewardName: string | null
  status: RedemptionStatus
  cost: number
  refundedRewards: number
  createdAt: string
  productName?: string | null
  remainingAmount: number
}

function formatUser(user: RefundableRedemption["user"]): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return name ? `${name} • ${user.email}` : user.email
}

function useSelectedRedemption(
  redemptions: RefundableRedemption[],
  selectedId: string,
) {
  return useMemo(() => {
    if (!selectedId) return null
    return redemptions.find((redemption) => redemption.id === selectedId) ?? null
  }, [redemptions, selectedId])
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Processing…" : "Issue refund"}
    </Button>
  )
}

type RefundRedemptionFormProps = {
  redemptions: RefundableRedemption[]
}

export default function RefundRedemptionForm({
  redemptions,
}: RefundRedemptionFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<string>("")
  const [revertPerk, setRevertPerk] = useState(true)
  const [state, formAction] = useFormState<RefundRewardsFormState, FormData>(
    refundRedemptionAction,
    initialRefundRewardsState,
  )

  const selected = useSelectedRedemption(redemptions, selectedRedemptionId)
  const disabledSubmit = !selected
  const remainingAmount = selected?.remainingAmount ?? 0

  useEffect(() => {
    if (state.status === "success") {
      if (state.message) {
        toast.success(state.message)
      } else {
        toast.success("Refund processed")
      }
      formRef.current?.reset()
      setSelectedRedemptionId("")
      setRevertPerk(true)
    } else if (state.status === "error" && state.message) {
      toast.error(state.message)
    }
  }, [state])

  const emptyState = redemptions.length === 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Refund reward redemptions</CardTitle>
          <CardDescription>
            Select a redemption to return rewards to the member. Refunds restore
            the original balance and log a dedicated refund transaction for
            auditing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-6">
            <fieldset className="space-y-2">
              <Label htmlFor="redemptionId">Redemption</Label>
              <Select
                value={selectedRedemptionId}
                onValueChange={setSelectedRedemptionId}
                name="redemptionSelect"
                disabled={emptyState}
              >
                <SelectTrigger
                  id="redemptionId"
                  aria-invalid={!selectedRedemptionId && state.status === "error"}
                  className="w-full"
                >
                  <SelectValue
                    placeholder={
                      emptyState
                        ? "No refundable redemptions"
                        : "Choose a redemption"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72 w-[26rem]">
                  {redemptions.map((redemption) => (
                    <SelectItem key={redemption.id} value={redemption.id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-foreground">
                          {redemption.rewardName ?? redemption.featureKey}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatUser(redemption.user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {statusLabels[redemption.status]} • {redemption.cost} rewards
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="redemptionId" value={selectedRedemptionId} />
              <p className="text-sm text-muted-foreground">
                {emptyState
                  ? "No redemptions are eligible for a refund right now."
                  : "Only redemptions with an outstanding refundable balance are listed."}
              </p>
            </fieldset>

            {selected ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Member
                    </dt>
                    <dd className="font-medium text-foreground">
                      {formatUser(selected.user)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Redemption status
                    </dt>
                    <dd className="flex items-center gap-2">
                      <Badge variant={statusVariants[selected.status]}>
                        {statusLabels[selected.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(selected.createdAt &&
                          formatDistanceToNow(new Date(selected.createdAt), {
                            addSuffix: true,
                          })) || ""}
                      </span>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Refund amount
                    </dt>
                    <dd className="font-mono text-foreground">
                      {remainingAmount} rewards
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs uppercase text-muted-foreground">
                      Product
                    </dt>
                    <dd className="text-foreground">
                      {selected.productName ?? "Not applicable"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <fieldset className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                name="reason"
                rows={3}
                required
                disabled={emptyState}
                placeholder="Explain why this redemption is being refunded"
              />
            </fieldset>

            <fieldset className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                name="reference"
                placeholder="Link an internal ticket or document"
                disabled={emptyState}
              />
            </fieldset>

            <fieldset className="space-y-2">
              <Label htmlFor="revert-perk">Revoke perk access</Label>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-foreground">
                    Remove entitlements and schedules
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Turn off to keep the perk active even after issuing the refund.
                  </span>
                </div>
                <Switch
                  id="revert-perk"
                  checked={revertPerk}
                  onCheckedChange={setRevertPerk}
                  disabled={emptyState}
                />
              </div>
            </fieldset>

            <input
              type="hidden"
              name="revertPerk"
              value={revertPerk ? "true" : "false"}
            />
            <input type="hidden" name="idempotencyKey" value="" />

            {state.status === "error" && state.message ? (
              <div
                className={cn(
                  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                )}
                role="alert"
              >
                {state.message}
              </div>
            ) : null}

            {state.status === "success" && state.message ? (
              <div
                className={cn(
                  "rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-700",
                )}
                role="status"
              >
                {state.message}
              </div>
            ) : null}

            <div className="flex justify-end">
              <SubmitButton disabled={disabledSubmit || emptyState} />
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Refunds immediately credit the member’s reward balance and persist a
          refund transaction for traceability.
        </CardFooter>
      </Card>
    </div>
  )
}
