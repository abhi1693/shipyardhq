"use client"

import { Inbox } from "@novu/nextjs"
import type { Tab } from "@novu/nextjs"
import { useUser } from "@clerk/nextjs"

const NOVU_APPLICATION_IDENTIFIER =
  process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER ?? ""

const INBOX_TABS: Tab[] = [
  { label: "All", filter: { tags: [] } },
  { label: "Products", filter: { tags: ["product-notifications"] } },
  { label: "Rewards", filter: { tags: ["rewards"] } },
]

export default function NovuInbox() {
  const { user, isLoaded } = useUser()
  const subscriberId = user?.id ?? null

  if (!isLoaded) return null
  if (!subscriberId) return null

  return (
    <Inbox
      applicationIdentifier={NOVU_APPLICATION_IDENTIFIER}
      subscriber={subscriberId}
      placement="bottom-end"
      tabs={INBOX_TABS}
    />
  )
}
