import {
  ensureNovuSubscriber,
  isNovuEnabled,
  subscribeNovuTopic,
  type NovuSubscriberInput,
} from "@/lib/server/notifications/novu"

export const NOVU_BROADCAST_TOPIC_KEY =
  process.env.NOVU_TOPIC_BROADCAST?.trim() || "broadcast"

export async function subscribeUserToBroadcastTopic(input: {
  subscriberId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
}): Promise<void> {
  if (!isNovuEnabled()) return

  const subscriberId = input.subscriberId?.trim()
  if (!subscriberId) return

  const subscriber: NovuSubscriberInput = {
    subscriberId,
    email: input.email ?? undefined,
    firstName: input.firstName ?? undefined,
    lastName: input.lastName ?? undefined,
    avatar: input.avatar ?? undefined,
  }

  await ensureNovuSubscriber(subscriber)
  await subscribeNovuTopic(NOVU_BROADCAST_TOPIC_KEY, subscriberId)
}
