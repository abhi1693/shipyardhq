"use client"

import { type ReactNode, useTransition } from "react"
import { hasPixelConsent, pixelId } from "@/lib/analytics/openaiPixel"
import {
  choosePlanAction,
  choosePlanForCheckout,
} from "@/actions/member/products/actions"

type PlanContext = Parameters<typeof choosePlanAction>[0]

export function PlanCheckoutForm({
  context,
  children,
}: {
  context: PlanContext
  children: ReactNode
}) {
  const [pending, startTransition] = useTransition()
  return (
    <form
      action={choosePlanAction.bind(null, context)}
      onSubmit={(event) => {
        if (!pixelId || !hasPixelConsent()) return
        event.preventDefault()
        if (pending) return
        const data = new FormData(event.currentTarget)
        startTransition(async () => {
          const result = await choosePlanForCheckout(context, data)
          if (!result) return
          try {
            if (hasPixelConsent())
              window.oaiq?.("measure", "checkout_started", { type: "contents" })
          } finally {
            window.location.assign(result.checkoutUrl)
          }
        })
      }}
    >
      <fieldset disabled={pending}>{children}</fieldset>
    </form>
  )
}
