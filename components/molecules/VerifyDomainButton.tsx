"use client"

import { useTransition } from "react"
import { verifyProductDomainAction } from "@/actions/products/actions"
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
          const result = await verifyProductDomainAction(productId)
          if (result.success) {
            toast.success("Domain verified successfully.")
          } else {
            toast.error(result.error)
          }
          location.reload()
        })
      }}
    >
      <CheckCircle2 className="h-4 w-4" /> {label}
    </Button>
  )
}
