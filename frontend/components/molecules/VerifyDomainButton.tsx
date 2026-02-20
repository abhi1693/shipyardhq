"use client"

import { useTransition } from "react"
import { Button } from "@/components/atoms/button"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

export function VerifyDomainButton({
  productId,
  label = "Verify Domain",
}: {
  productId: string
  label?: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const response = await fetch(
            `/api/products/${encodeURIComponent(productId)}/verify-domain`,
            {
              method: "POST",
            },
          )
          const result = (await response.json().catch(() => null)) as
            | { success?: boolean; error?: string }
            | null

          if (result?.success) {
            toast.success("Domain verified successfully.")
          } else {
            toast.error(result?.error ?? "Unable to verify domain.")
          }
          location.reload()
        })
      }}
    >
      <CheckCircle2 className="h-4 w-4" /> {label}
    </Button>
  )
}
