import { auth } from "@clerk/nextjs/server"

import NotificationCenter from "@/components/organisms/notifications/NotificationCenter"
import { listNotificationsForUserCached } from "@/lib/server/notifications/service"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Bell } from "lucide-react"

export async function MemberNotificationsPageContent() {
  const { userId: clerkUserId } = await auth()
  const activeUser = await requireActiveUserOrRedirect(clerkUserId)
  const initialData = await listNotificationsForUserCached(activeUser.id, {
    limit: 25,
  })

  return <NotificationCenter initialData={initialData} />
}

export function MemberNotificationsPageSkeleton() {
  return (
    <div className="space-y-6">
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={4}
        showFooter
        className="border-slate-200/80 bg-white/95 shadow-sm"
      />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <CardSkeleton
             
            key={index}
            tone="soft"
            radius="lg"
            lines={3}
            className="border border-slate-200 bg-white"
            showFooter={false}
          />
        ))}
      </div>
      <div className="flex justify-center">
        <ButtonSkeleton size="sm" variant="outline" labelWidth="6rem" />
      </div>
    </div>
  )
}
