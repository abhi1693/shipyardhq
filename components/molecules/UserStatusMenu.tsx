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
import { setUserStatusAction } from "@/actions/admin/users/actions"
import { toast } from "sonner"
import { Settings2, PauseCircle, CheckCircle2, OctagonAlert } from "lucide-react"
import { UserStatus } from "@/lib/vendor/prisma/client"
import { useUser } from "@clerk/nextjs"

const STATUS_MESSAGE: Record<UserStatus, string> = {
  active: "User activated",
  suspended: "User suspended",
  terminated: "User terminated",
}

export default function UserStatusMenu({
  userId,
  clerkId,
  status,
}: {
  userId: string
  clerkId: string
  status: UserStatus
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { user: currentUser, isLoaded } = useUser()

  const isSelf = Boolean(currentUser?.id && currentUser.id === clerkId)

  if (!isLoaded || isSelf) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title={
          !isLoaded
            ? "Checking permissions"
            : "You cannot change your own status"
        }
      >
        <Settings2 className="mr-2 h-4 w-4" />
        Set Status
      </Button>
    )
  }

  function updateStatus(next: UserStatus) {
    startTransition(async () => {
      const result = await setUserStatusAction(userId, next)

      if ((result as any)?.error) {
        toast.error((result as any).error)
        return
      }

      toast.success(STATUS_MESSAGE[next])
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
          aria-label="Set user status"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Set Status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {status !== "active" && (
          <DropdownMenuItem onClick={() => updateStatus("active")}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
          </DropdownMenuItem>
        )}
        {status !== "suspended" && (
          <DropdownMenuItem onClick={() => updateStatus("suspended")}>
            <PauseCircle className="mr-2 h-4 w-4" /> Suspend
          </DropdownMenuItem>
        )}
        {status !== "terminated" && (
          <DropdownMenuItem onClick={() => updateStatus("terminated")}>
            <OctagonAlert className="mr-2 h-4 w-4" /> Terminate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
