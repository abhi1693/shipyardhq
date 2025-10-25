"use client"

import { useMemo, useRef, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { toast } from "sonner"

import { adjustUserRewardsAction } from "@/actions/admin/rewards/actions"
import {
  initialAdjustRewardsState,
  type AdjustRewardsFormState,
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

type AdjustRewardsFormProps = {
  users: UserOption[]
}

export default function AdjustRewardsForm({ users }: AdjustRewardsFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [state, formAction] = useFormState<AdjustRewardsFormState, FormData>(
    async (previousState, formData) => {
      try {
        const result = await adjustUserRewardsAction(previousState, formData)
        if (result.status === "success") {
          toast.success(result.message ?? "Rewards adjusted")
          formRef.current?.reset()
          setSelectedUserId("")
          setSearchQuery("")
        } else if (result.status === "error" && result.message) {
          toast.error(result.message)
        }
        return result
      } catch (error) {
        toast.error("Unable to adjust rewards")
        throw error
      }
    },
    initialAdjustRewardsState,
  )

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return users
    }

    return users.filter((user) => {
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim()
      const haystack = `${fullName} ${user.email}`.toLowerCase()

      return haystack.includes(query)
    })
  }, [searchQuery, users])

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
                value={selectedUserId === "" ? undefined : selectedUserId}
                onValueChange={(value) => {
                  setSelectedUserId(value)
                  setSearchQuery("")
                }}
                onOpenChange={(open) => {
                  if (!open) {
                    setSearchQuery("")
                  }
                }}
                name="userSelect"
              >
                <SelectTrigger
                  size="default"
                  className="w-full"
                  aria-invalid={!selectedUserId && state.status === "error"}
                >
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-none">
                  <div className="sticky top-0 z-10 border-b border-border/60 bg-popover/95 px-3 pb-3 pt-2 backdrop-blur">
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name or email..."
                      autoFocus
                      className="h-9 w-full"
                      aria-label="Search users"
                    />
                  </div>

                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const name = [user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(" ")
                      const hasName = Boolean(name)

                      return (
                        <SelectItem key={user.id} value={user.id}>
                          <span className="flex flex-col text-left">
                            <span className="text-sm font-medium">
                              {hasName ? name : user.email}
                            </span>
                            {hasName ? (
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            ) : null}
                          </span>
                        </SelectItem>
                      )
                    })
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      {searchQuery
                        ? `No users match "${searchQuery}".`
                        : "No users found."}
                    </div>
                  )}
                </SelectContent>
              </Select>
              <input type="hidden" name="userId" value={selectedUserId} />
              <p className="text-sm text-muted-foreground">
                {users.length
                  ? "Start typing to filter members by name or email."
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
