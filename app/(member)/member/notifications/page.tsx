import { auth } from "@clerk/nextjs/server"

import NotificationCenter from "@/components/organisms/notifications/NotificationCenter"
import { listNotificationsForUser } from "@/lib/server/notifications/service"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { buildPageMetadata } from "@/lib/metadata"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Notifications",
  description: "Stay on top of product activity and reward updates.",
})

export default async function MemberNotificationsPage() {
  const { userId: clerkUserId } = await auth()
  const activeUser = await requireActiveUserOrRedirect(clerkUserId)
  const initialData = await listNotificationsForUser(activeUser.id, {
    limit: 25,
  })

  return <NotificationCenter initialData={initialData} />
}
