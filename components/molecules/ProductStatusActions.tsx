"use client"

import { useTransition } from "react"
import { Badge } from "@/components/atoms/badge"
import { setProductStatusAction } from "@/actions/admin/products/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import PublishButton from "@/components/molecules/PublishButton"
import UnpublishButton from "@/components/molecules/UnpublishButton"
import UnarchiveButton from "@/components/molecules/UnarchiveButton"
import ArchiveButton from "@/components/molecules/ArchiveButton"

export default function ProductStatusActions({
  productId,
  status,
}: {
  productId: string
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
    status === "published"
      ? "success"
      : status === "draft"
        ? "secondary"
        : "outline"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={badgeVariant as any}>{status}</Badge>
      {status !== "published" && (
        <PublishButton
          size="sm"
          onClick={() => updateStatus("published")}
          disabled={isPending}
        />
      )}
      {status === "published" && (
        <UnpublishButton
          size="sm"
          onClick={() => updateStatus("draft")}
          disabled={isPending}
        />
      )}
      {status === "archived" && (
        <UnarchiveButton
          size="sm"
          onClick={() => updateStatus("draft")}
          disabled={isPending}
        />
      )}
      {status !== "archived" && (
        <ArchiveButton
          size="sm"
          onClick={() => updateStatus("archived")}
          disabled={isPending}
        />
      )}
    </div>
  )
}
