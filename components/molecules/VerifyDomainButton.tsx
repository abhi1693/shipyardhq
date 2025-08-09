"use client"

import { useTransition } from "react"
import { verifyProductDomainAction } from "@/actions/admin/products/actions"
import { Button } from "@/components/atoms/button"
import { toast } from "sonner"

export function VerifyDomainButton({ productId }: { productId: string }) {
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
      Verify Domain
    </Button>
  )
}
