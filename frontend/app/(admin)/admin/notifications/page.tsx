import { getNotificationUsers } from "@/actions/admin/notifications/actions"
import { buildPageMetadata } from "@/lib/metadata"

import NotificationCenter from "./notification-center"

export const metadata = buildPageMetadata({
  title: "Notifications",
  section: "Admin",
  description: "Send on-demand updates to targeted member segments.",
})

export default async function NotificationsPage() {
  const users = await getNotificationUsers()

  return <NotificationCenter users={users} />
}
