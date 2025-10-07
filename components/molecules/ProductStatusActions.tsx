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
import { AlertModal } from "@/components/atoms/alert-modal"

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
        <AlertModal
          title="Unpublish this launch?"
          description="The product will disappear from the public directory until you publish it again. Existing analytics remain intact."
          confirmText="Unpublish"
          loading={isPending}
          onConfirm={() => updateStatus("draft")}
          trigger={(open) => (
            <UnpublishButton size="sm" onClick={open} disabled={isPending} />
          )}
        />
      )}
      {status === "archived" && (
        <AlertModal
          title="Restore this launch?"
          description="The launch will move back to draft so you can make updates before publishing again."
          confirmText="Restore"
          loading={isPending}
          onConfirm={() => updateStatus("draft")}
          trigger={(open) => (
            <UnarchiveButton size="sm" onClick={open} disabled={isPending} />
          )}
        />
      )}
      {status !== "archived" && (
        <AlertModal
          title="Archive this launch?"
          description="Archiving hides the launch from Shipyard listings and pauses new upvotes until you restore it."
          confirmText="Archive"
          loading={isPending}
          onConfirm={() => updateStatus("archived")}
          trigger={(open) => (
            <ArchiveButton size="sm" onClick={open} disabled={isPending} />
          )}
        />
      )}
    </div>
  )
}
