"use client"

import type { ComponentProps } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/atoms/button"

export default function MemberChoosePlanButton({
  productId,
  planId,
  redirectPath,
  children,
  disabled,
  ...buttonProps
}: {
  productId: string
  planId: string
  redirectPath: string
} & ComponentProps<typeof Button>) {
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/member/products/choose-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          planId,
          redirectPath,
        }),
      })

      const payload = (await response.json()) as {
        redirectUrl?: string
        error?: string
      }

      if (!response.ok || !payload.redirectUrl) {
        throw new Error(payload.error || "Unable to choose plan")
      }

      return payload.redirectUrl
    },
    onSuccess: (redirectUrl) => {
      window.location.assign(redirectUrl)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to choose plan",
      )
    },
  })

  return (
    <Button
      type="button"
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate()}
      {...buttonProps}
    >
      {children}
    </Button>
  )
}
