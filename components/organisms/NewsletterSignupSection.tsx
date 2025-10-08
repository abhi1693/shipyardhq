"use client"

import { FormEvent, useId, useState, useTransition } from "react"
import { subscribeToNewsletterAction } from "@/actions/public/newsletter/actions"
import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"

interface NewsletterSignupSectionProps {
  className?: string
}

type FormState =
  | { status: "idle"; message: null }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const INITIAL_STATE: FormState = { status: "idle", message: null }

export function NewsletterSignupSection({
  className,
}: NewsletterSignupSectionProps) {
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE)
  const [isPending, startTransition] = useTransition()
  const instanceId = useId().replace(/:/g, "")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    startTransition(async () => {
      const trimmed = email.trim()
      if (!trimmed) {
        setFormState({
          status: "error",
          message: "Enter a seaworthy email before we cast off.",
        })
        return
      }

      const result = await subscribeToNewsletterAction(trimmed)
      if (result.error) {
        setFormState({ status: "error", message: result.error })
        return
      }

      setFormState({
        status: "success",
    message: "You're in! We'll ping you when the next launch goes live.",
      })
      setEmail("")
    })
  }

  const helperId = `${instanceId}-newsletter-feedback`
  const inputId = `${instanceId}-newsletter-email`

  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-white px-8 py-12 shadow-sm",
        "lg:px-12 lg:py-16",
        className,
      )}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-center">
        <div className="space-y-5 text-foreground">
          <p className="inline-flex items-center rounded-full border border-border bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Newsletter
          </p>
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
            Chart the course with the Captain&apos;s Log
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Shipyard highlights the freshest launches, behind-the-scenes maker
            stories, and featured opportunities. Drop your email and we&apos;ll
            make sure you never miss a signal flare.
          </p>
        </div>

        <form
          className="relative flex flex-col gap-4 rounded-[28px] border border-border bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
          aria-describedby={helperId}
        >
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={inputId}
          >
            Email address
          </label>
          <Input
            id={inputId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@workmail.com"
            autoComplete="email"
            required
            className="h-11"
          />
          <Button
            type="submit"
            disabled={isPending}
            variant="secondary"
            className="h-11 w-full text-sm font-semibold"
          >
            {isPending ? "Submitting..." : "Subscribe"}
          </Button>
          <p
            id={helperId}
            role="status"
            aria-live="polite"
            className={cn(
              "text-xs transition-colors",
              formState.status === "error"
                ? "text-red-600"
                : formState.status === "success"
                  ? "text-emerald-600"
                  : "text-muted-foreground",
            )}
          >
            {formState.message ||
              "No spam. Just launch and product updates from the Shipyard team."}
          </p>
        </form>
      </div>
    </section>
  )
}
