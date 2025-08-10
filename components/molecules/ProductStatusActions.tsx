"use client"

import { useTransition } from "react"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import { setProductStatusAction } from "@/actions/admin/products/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function ProductStatusActions({
  productId,
  slug,
  status,
}: {
  productId: string
  slug: string
  status: "draft" | "published" | "archived"
}) {
  const [isPending, start] = useTransition()
  const router = useRouter()

  function updateStatus(next: "draft" | "published" | "archived") {
    start(async () => {
      const res = (await setProductStatusAction(productId, next)) as any
      if (res?.error) toast.error(res.error)
      else toast.success(`Status set to ${next}`)
      router.refresh()
    })
  }

  const badgeVariant =
    status === "published" ? "success" : status === "draft" ? "secondary" : "outline"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={badgeVariant as any}>{status}</Badge>
      {status !== "published" && (
        <Button size="sm" onClick={() => updateStatus("published")} disabled={isPending}>
          Publish
        </Button>
      )}
      {status === "published" && (
        <Button size="sm" variant="outline" onClick={() => updateStatus("draft")} disabled={isPending}>
          Unpublish
        </Button>
      )}
      {status !== "archived" && (
        <Button size="sm" variant="destructive" onClick={() => updateStatus("archived")} disabled={isPending}>
          Archive
        </Button>
      )}
    </div>
  )
}

