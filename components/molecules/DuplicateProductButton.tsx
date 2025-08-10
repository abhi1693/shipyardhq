"use client"

import { useTransition } from "react"
import { duplicateProductAction } from "@/actions/admin/products/actions"
import { Button } from "@/components/atoms/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy } from "lucide-react"

export default function DuplicateProductButton({
  productId,
}: {
  productId: string
}) {
  const [isPending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        start(async () => {
          const res = (await duplicateProductAction(productId)) as any
          if (res?.error) {
            toast.error(res.error)
          } else {
            toast.success("Duplicated. Opening draft…")
            router.push(`/member/products/${res.slug}/edit`)
          }
        })
      }}
    >
      <Copy className="h-4 w-4 mr-2" /> Duplicate
    </Button>
  )
}
