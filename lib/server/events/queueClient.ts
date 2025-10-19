import { buildCacheKey, namespaceCacheKey } from "@/lib/server/cache"
import { getRedisClient } from "@/lib/server/redis"

const RAW_EVENTS_QUEUE_KEY = buildCacheKey("events", "queue")
const EVENTS_QUEUE_KEY = namespaceCacheKey(RAW_EVENTS_QUEUE_KEY)
export const MAX_BATCH_SIZE = 25

export async function enqueueEvent(envelopeId: string): Promise<void> {
  const client = await getRedisClient()
  if (!client) {
    throw new Error("Redis client unavailable for event queue")
  }
  await client.rPush(EVENTS_QUEUE_KEY, envelopeId)
}

export async function dequeueEnvelopeBatch(
  batchSize: number = MAX_BATCH_SIZE,
): Promise<string[]> {
  const client = await getRedisClient()
  if (!client) return []

  const ids: string[] = []
  for (let i = 0; i < batchSize; i += 1) {
    const id = await client.lPop(EVENTS_QUEUE_KEY)
    if (!id) break
    ids.push(id)
  }
  return ids
}

export async function requeueEnvelope(envelopeId: string): Promise<void> {
  const client = await getRedisClient()
  if (!client) return
  await client.lPush(EVENTS_QUEUE_KEY, envelopeId)
}

export { EVENTS_QUEUE_KEY }
