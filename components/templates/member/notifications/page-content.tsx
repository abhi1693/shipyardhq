import { auth } from "@clerk/nextjs/server"

import NotificationCenter from "@/components/organisms/notifications/NotificationCenter"
import { listNotificationsForUserCached } from "@/lib/server/notifications/service"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { Skeleton } from "@/components/atoms/skeleton"
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
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-2xl font-semibold">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Bell className="h-4 w-4" aria-hidden="true" />
              </span>
              <Skeleton className="h-6 w-40 rounded-md" />
            </span>
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64 rounded-md" />
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
