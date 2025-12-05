"use client"

import { useEffect, useState } from "react"
import { Inbox } from "@novu/nextjs"
import type { Preference, PreferenceGroups, Tab } from "@novu/nextjs"
import { useUser } from "@clerk/nextjs"

const NOVU_APPLICATION_IDENTIFIER =
  process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER?.trim() ?? ""

const CATEGORY_TAGS = {
  activity: ["product-notifications"],
  recommendations: ["newsletter","discover"],
  updates: ["system-updates", "organization", "leaderboard", "invite", "winner"],
  rewards: ["rewards"],
}

const TAGS_IN_GROUPS = new Set(Object.values(CATEGORY_TAGS).flat())

const INBOX_TABS: Tab[] = [
  { label: "All", filter: { tags: [] } },
  { label: "Activity", filter: { tags: CATEGORY_TAGS.activity } },
  {
    label: "Recommendations",
    filter: { tags: CATEGORY_TAGS.recommendations },
  },
  { label: "Updates", filter: { tags: CATEGORY_TAGS.updates } },
  { label: "Rewards", filter: { tags: CATEGORY_TAGS.rewards } },
]

const PREFERENCE_GROUPS: PreferenceGroups = [
  { name: "Activity", filter: { tags: CATEGORY_TAGS.activity } },
  {
    name: "Recommendations",
    filter: { tags: CATEGORY_TAGS.recommendations },
  },
  { name: "Updates", filter: { tags: CATEGORY_TAGS.updates } },
  { name: "Rewards", filter: { tags: CATEGORY_TAGS.rewards } },
  {
    name: "Other",
    filter: ({ preferences }) =>
      preferences.filter((preference) => {
        const tags = preference.workflow?.tags ?? []
        if (!tags.length) return true
        return !tags.some((tag) => TAGS_IN_GROUPS.has(tag))
      }),
  },
]

const PREFERENCE_SORT = (a: Preference, b: Preference) => {
  const left = a.workflow?.name ?? ""
  const right = b.workflow?.name ?? ""
  return left.localeCompare(right)
}

export default function NovuInbox() {
  const { user, isLoaded, isSignedIn } = useUser()
  const subscriberId = user?.id?.trim() ?? null
  const [subscriberHash, setSubscriberHash] = useState<string | null>(null)
  const [hashError, setHashError] = useState(false)

  useEffect(() => {
    if (!subscriberId) return undefined

    let isActive = true
    setHashError(false)
    setSubscriberHash(null)

    async function loadSubscriberHash() {
      try {
        const response = await fetch("/api/novu/hmac", {
          method: "GET",
        })

        if (!response.ok) {
          throw new Error(
            `Failed to fetch subscriber hash (status ${response.status})`,
          )
        }

        const payload = (await response.json()) as {
          hash?: string
        }

        if (!payload.hash) {
          throw new Error("Missing hash in response")
        }

        if (isActive) {
          setSubscriberHash(payload.hash)
        }
      } catch (error) {
        console.error("Unable to load Novu subscriber hash", error)
        if (isActive) {
          setHashError(true)
        }
      }
    }

    void loadSubscriberHash()

    return () => {
      isActive = false
    }
  }, [subscriberId])

  if (!isLoaded || !isSignedIn) return null
  if (!subscriberId) return null
  if (!NOVU_APPLICATION_IDENTIFIER) return null
  if (!subscriberHash || hashError) return null

  return (
    <Inbox
      applicationIdentifier={NOVU_APPLICATION_IDENTIFIER}
      subscriber={subscriberId}
      subscriberHash={subscriberHash}
      placement="bottom-end"
      tabs={INBOX_TABS}
      preferenceGroups={PREFERENCE_GROUPS}
      preferencesSort={PREFERENCE_SORT}
    />
  )
}
