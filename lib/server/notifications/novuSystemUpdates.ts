import { subscribeNovuTopic } from "@/lib/server/notifications/novu"

export const NOVU_SYSTEM_UPDATES_TOPIC_KEY =
  process.env.NOVU_TOPIC_SYSTEM_UPDATES?.trim() || "system-updates"

export async function subscribeToSystemUpdatesTopic(
  subscriberId: string,
): Promise<void> {
  const normalized = subscriberId?.trim()
  if (!normalized) return

  await subscribeNovuTopic(NOVU_SYSTEM_UPDATES_TOPIC_KEY, normalized)
}
