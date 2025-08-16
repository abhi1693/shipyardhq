"use client"

import { useState, useMemo } from "react"
import type { UseFormReturn, FieldValues } from "react-hook-form"

type ValidateExternal = () => Promise<boolean>

export function useProductWizard<TValues extends FieldValues = any>({
  form,
  steps,
  stepFields,
  validateExternal,
  onSubmit,
}: {
  form: UseFormReturn<TValues>
  steps: { id: number; label: string }[]
  stepFields: Record<number, readonly string[]>
  validateExternal: ValidateExternal
  onSubmit: (values: TValues & { status?: string }) => Promise<void>
}) {
  const [step, setStep] = useState<number>(1)
  const isReview = useMemo(() => step === steps.length, [step, steps.length])

  async function next() {
    const fields = stepFields[step] as any
    const valid = await form.trigger(fields, { shouldFocus: true })
    if (!valid) return
    setStep((s) => Math.min(s + 1, steps.length))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function submitWithStatus(status: string) {
    form.setValue("status" as any, status as any)
    const valid = await form.trigger(undefined, { shouldFocus: true })
    if (!valid) {
      setStep(1)
      return
    }
    if (status === "published") {
      const ok = await validateExternal()
      if (!ok) {
        setStep(steps.length)
        return
      }
    }
    await form.handleSubmit((vals: any) =>
      onSubmit({ ...(vals as any), status } as any),
    )()
  }

  return { step, setStep, isReview, next, back, submitWithStatus }
}
