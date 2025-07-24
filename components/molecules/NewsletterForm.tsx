"use client"

import { useTransition } from "react"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import { toast } from "sonner"

export type NewsletterFormProps = {
  /** Server action to call */
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  /** Email input placeholder */
  emailPlaceholder?: string
  /** Submit button label */
  submitLabel?: string
  /** Extra hidden inputs */
  hiddenFields?: { name: string; value: string }[]
  /** Additional classes for the form wrapper */
  className?: string
  /** Additional classes for the submit button */
  buttonClass?: string
}

export function NewsletterForm({
  action,
  emailPlaceholder = "Enter your email",
  submitLabel = "Subscribe →",
  hiddenFields = [],
  className = "",
  buttonClass = "",
}: NewsletterFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData)
      if (result.success) {
        toast.success("Subscribed!", {
          description: "You have been added to our list.",
        })
      } else {
        toast.error(result.error ?? "Something went wrong.")
      }
    })
  }

  return (
    <form action={handleSubmit} className={`flex gap-2 ${className}`}>
      {hiddenFields.map((field) => (
        <input
          key={field.name}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}

      <Input
        name="email"
        type="email"
        placeholder={emailPlaceholder}
        required
        className="
          flex-1
          border border-gray-300
          bg-white
          focus:outline-none
          focus:ring-2 focus:ring-[var(--accent)]
        "
      />

      <Button
        type="submit"
        disabled={isPending}
        className={`
          bg-[var(--accent)]
          text-white
          py-2 px-6
          rounded-lg
          transform transition
          hover:scale-105
          disabled:opacity-50
          ${buttonClass}
        `}
      >
        {isPending ? "Subscribing…" : submitLabel}
      </Button>
    </form>
  )
}
