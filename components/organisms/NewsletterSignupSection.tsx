"use client"

import { FormEvent, useState, useTransition } from "react"
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
        message: "All hands! We'll ping you when the next launch sets sail.",
      })
      setEmail("")
    })
  }

  const helperId = "newsletter-signup-feedback"
  const inputId = "newsletter-signup-email"

  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100 px-8 py-12 shadow-[0_40px_120px_-60px_rgba(16,70,126,0.55)] dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
        "lg:px-12 lg:py-16",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[color:var(--brand-2)/0.18] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-10 h-64 w-64 rounded-full bg-[color:var(--brand-3)/0.22] blur-3xl"
      />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-center">
        <div className="space-y-5 text-slate-900 dark:text-slate-100">
          <p className="inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-2)] shadow-sm backdrop-blur dark:bg-white/5 dark:text-[color:var(--brand-2)]">
            Newsletter
          </p>
          <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
            Chart the course with the Captain&apos;s Log
          </h2>
          <p className="max-w-2xl text-base text-slate-700 dark:text-slate-300">
            Shipyard highlights the freshest launches, behind-the-scenes maker
            stories, and featured opportunities. Drop your email and we&apos;ll
            make sure you never miss a signal flare.
          </p>
        </div>

        <form
          className="relative flex flex-col gap-4 rounded-[28px] bg-white/90 p-6 shadow-lg backdrop-blur dark:bg-slate-950/60"
          onSubmit={handleSubmit}
          aria-describedby={helperId}
        >
          <label
            className="text-sm font-medium text-slate-800 dark:text-slate-200"
            htmlFor={inputId}
          >
            Email address
          </label>
          <Input
            id={inputId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@crewmail.com"
            autoComplete="email"
            required
            className="h-11"
          />
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-full bg-[color:var(--brand-2)] text-sm font-semibold tracking-wide text-white transition hover:bg-[color:var(--brand-2)/0.9]"
          >
            {isPending ? "Hoisting sails..." : "Signal the lighthouse"}
          </Button>
          <p
            id={helperId}
            role="status"
            aria-live="polite"
            className={cn(
              "text-xs transition-colors",
              formState.status === "error"
                ? "text-red-600 dark:text-red-400"
                : formState.status === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground",
            )}
          >
            {formState.message ||
              "No spam. Just charted course updates from the Shipyard crew."}
          </p>
        </form>
      </div>
    </section>
  )
}
