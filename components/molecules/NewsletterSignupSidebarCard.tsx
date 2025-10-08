"use client"

import { FormEvent, useId, useState, useTransition } from "react"

import { subscribeToNewsletterAction } from "@/actions/public/newsletter/actions"
import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"
import { launchPrimaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

interface NewsletterSignupSidebarCardProps {
  className?: string
}

type FormState =
  | { status: "idle"; message: null }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

const INITIAL_STATE: FormState = { status: "idle", message: null }

export function NewsletterSignupSidebarCard({
  className,
}: NewsletterSignupSidebarCardProps) {
  const [email, setEmail] = useState("")
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE)
  const [isPending, startTransition] = useTransition()
  const instanceId = useId().replace(/:/g, "")

  const helperId = `${instanceId}-newsletter-sidebar-feedback`
  const inputId = `${instanceId}-newsletter-sidebar-email`

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

  return (
    <section
      className={brandGradient(
        "overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.18] p-6 text-white shadow-[0_22px_48px_-32px_rgba(7,78,134,0.45)]",
        className,
      )}
    >
      <div className="space-y-3 text-white">
        <span
          className={gradientTint(
            "inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80",
          )}
        >
          Newsletter
        </span>
        <h3 className="text-lg font-semibold leading-tight">
          Join the Launch Briefing
        </h3>
        <p className="text-sm text-white/85">
          Indie launch debriefs, maker spotlights, and practical growth tips.
        </p>
      </div>

      <form
        className={gradientTint(
          "mt-5 flex flex-col gap-3 rounded-2xl p-5 shadow-sm backdrop-blur",
        )}
        onSubmit={handleSubmit}
        aria-describedby={helperId}
      >
        <label
          className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/70"
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
          className="h-10 rounded-full border-white/40 bg-white text-foreground placeholder:text-muted-foreground/70 focus-visible:border-white focus-visible:ring-white/60"
        />
        <button
          type="submit"
          disabled={isPending}
          className={launchPrimaryButton({
            size: "sm",
            className:
              "w-full disabled:pointer-events-none disabled:opacity-60",
          })}
        >
          {isPending ? "Submitting..." : "Join the briefing"}
        </button>
        <p
          id={helperId}
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs transition-colors",
            formState.status === "error"
              ? "text-red-100"
              : formState.status === "success"
                ? "text-emerald-100"
                : "text-white/70",
          )}
        >
          {formState.message ||
            "Signals only—no spam, just the freshest Shipyard intel."}
        </p>
      </form>
    </section>
  )
}
