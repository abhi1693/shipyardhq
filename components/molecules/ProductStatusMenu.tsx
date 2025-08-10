"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/atoms/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/atoms/dropdown-menu"
import { setProductStatusAction } from "@/actions/admin/products/actions"
import { toast } from "sonner"
import { Settings2, Rocket, EyeOff, Undo2, Archive } from "lucide-react"

export default function ProductStatusMenu({
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          aria-label="Set status"
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Set Status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {status !== "published" && (
          <DropdownMenuItem onClick={() => updateStatus("published")}>
            <Rocket className="h-4 w-4 mr-2" /> Publish
          </DropdownMenuItem>
        )}
        {status === "published" && (
          <DropdownMenuItem onClick={() => updateStatus("draft")}>
            <EyeOff className="h-4 w-4 mr-2" /> Unpublish
          </DropdownMenuItem>
        )}
        {status === "archived" && (
          <DropdownMenuItem onClick={() => updateStatus("draft")}>
            <Undo2 className="h-4 w-4 mr-2" /> Unarchive
          </DropdownMenuItem>
        )}
        {status !== "archived" && (
          <DropdownMenuItem onClick={() => updateStatus("archived")}>
            <Archive className="h-4 w-4 mr-2" /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
