"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { claimProductAction } from "@/actions/public/products/claim"
import { Button } from "@/components/atoms/button"
import { productPath } from "@/lib/routes"

export function ClaimProductButton({
  productId,
  slug,
}: {
  productId: string
  slug: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="default"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const outcome = await claimProductAction(productId)
          if ("error" in outcome) {
            toast.error(outcome.error)
            return
          }
          toast.success("Product claimed successfully.")
          const targetSlug = outcome.slug || slug
          router.push(productPath(targetSlug))
        })
      }
    >
      {pending ? "Verifying…" : "Claim this product"}
    </Button>
  )
}
