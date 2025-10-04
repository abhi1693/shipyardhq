"use client"

import { useEffect, useRef, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { toast } from "sonner"

import { adjustUserPointsAction } from "@/actions/admin/points/actions"
import {
  initialAdjustPointsState,
  type AdjustPointsFormState,
} from "@/actions/admin/points/form-state"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Label } from "@/components/atoms/label"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

type UserOption = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Saving…" : "Submit adjustment"}
    </Button>
  )
}

type AdjustPointsFormProps = {
  users: UserOption[]
}

export default function AdjustPointsForm({ users }: AdjustPointsFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState<AdjustPointsFormState, FormData>(
    adjustUserPointsAction,
    initialAdjustPointsState,
  )
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  useEffect(() => {
    if (state.status === "success") {
      if (state.message) {
        toast.success(state.message)
      } else {
        toast.success("Rewards adjusted")
      }
      formRef.current?.reset()
      setSelectedUserId("")
    } else if (state.status === "error" && state.message) {
      toast.error(state.message)
    }
  }, [state])

  const disabledSubmit = users.length === 0 || !selectedUserId

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Adjust user rewards</CardTitle>
          <CardDescription>
            Grant or deduct rewards from a member manually. Positive amounts add
            rewards, negative amounts remove them. All adjustments are logged
            with your admin account for auditing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-6">
            <fieldset className="space-y-2">
              <Label htmlFor="userId">Select user</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                name="userSelect"
              >
                <SelectTrigger
                  size="default"
                  className="w-full"
                  aria-invalid={!selectedUserId && state.status === "error"}
                >
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent className="max-h-64 w-72">
                  {users.map((user) => {
                    const name = [user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ")
                    const label = name ? `${name} • ${user.email}` : user.email
                    return (
                      <SelectItem key={user.id} value={user.id}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <input type="hidden" name="userId" value={selectedUserId} />
              <p className="text-sm text-muted-foreground">
                {users.length
                  ? "Pick any active member from the list."
                  : "No users found."}
              </p>
            </fieldset>

            <fieldset className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                step="1"
                required
                placeholder="e.g. 50 or -25"
              />
              <p className="text-sm text-muted-foreground">
                Use whole numbers only. Positive values grant rewards, negative
                values deduct them.
              </p>
            </fieldset>

            <fieldset className="space-y-2">
              <Label htmlFor="notes">Reason</Label>
              <Textarea
                id="notes"
                name="notes"
                required
                rows={3}
                placeholder="Explain why you are adjusting this balance"
              />
            </fieldset>

            <fieldset className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                name="reference"
                placeholder="Link or internal ticket reference"
              />
            </fieldset>

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
              <SubmitButton disabled={disabledSubmit} />
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Adjustments are applied immediately and recorded as a dedicated reward
          transaction.
        </CardFooter>
      </Card>
    </div>
  )
}
