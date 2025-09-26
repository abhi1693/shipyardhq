import prisma from "@/lib/prisma"
import {
  buildCacheKey,
  namespaceCacheKey,
} from "@/lib/server/cache"
import { getRedisClient, type RedisClient } from "@/lib/server/redis"

export type VoteState = "upvoted" | "not_upvoted"

export interface PendingVoteRecord {
  desiredState: VoteState
  persistedState: VoteState
  updatedAt: number
}

const PENDING_PRODUCTS_KEY = namespaceCacheKey(
  buildCacheKey("product", "votes", "pending-products"),
)

function pendingVotesKey(productId: string) {
  return namespaceCacheKey(buildCacheKey("product", productId, "votes", "pending"))
}

function pendingDeltaKey(productId: string) {
  return namespaceCacheKey(buildCacheKey("product", productId, "votes", "delta"))
}

function toVoteState(flag: boolean): VoteState {
  return flag ? "upvoted" : "not_upvoted"
}

function computeDelta(desired: VoteState, persisted: VoteState): number {
  const desiredValue = desired === "upvoted" ? 1 : 0
  const persistedValue = persisted === "upvoted" ? 1 : 0
  return desiredValue - persistedValue
}

function encodeRecord(record: PendingVoteRecord): string {
  return JSON.stringify(record)
}

function decodeRecord(raw: string | null): PendingVoteRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingVoteRecord
    if (
      (parsed.desiredState === "upvoted" || parsed.desiredState === "not_upvoted") &&
      (parsed.persistedState === "upvoted" || parsed.persistedState === "not_upvoted") &&
      typeof parsed.updatedAt === "number"
    ) {
      return parsed
    }
  } catch (error) {
    console.error("Failed to parse vote record", { raw, error })
  }
  return null
}

async function fetchPersistedState(
  productId: string,
  userId: string,
): Promise<VoteState> {
  const existing = await prisma.productUpvote.findUnique({
    where: { productId_userId: { productId, userId } },
    select: { id: true },
  })
  return toVoteState(Boolean(existing))
}

async function getClient(
  provided?: RedisClient | null,
): Promise<RedisClient | null> {
  if (typeof provided !== "undefined") {
    return provided
  }
  return getRedisClient()
}

async function readStoredRecord(
  productId: string,
  userId: string,
  client?: RedisClient | null,
): Promise<{ client: RedisClient | null; record: PendingVoteRecord | null }> {
  const resolvedClient = await getClient(client)
  if (!resolvedClient) {
    return { client: null, record: null }
  }
  const raw = await resolvedClient.hGet(pendingVotesKey(productId), userId)
  const record = decodeRecord(raw)
  return { client: resolvedClient, record }
}

export async function resolveVoteState(
  productId: string,
  userId: string,
  client?: RedisClient | null,
): Promise<{
  client: RedisClient | null
  currentState: VoteState
  persistedState: VoteState
  record: PendingVoteRecord | null
}> {
  const { client: resolvedClient, record } = await readStoredRecord(
    productId,
    userId,
    client,
  )

  if (record) {
    return {
      client: resolvedClient,
      currentState: record.desiredState,
      persistedState: record.persistedState,
      record,
    }
  }

  const persistedState = await fetchPersistedState(productId, userId)
  return {
    client: resolvedClient,
    currentState: persistedState,
    persistedState,
    record: null,
  }
}

interface SetVoteStateOptions {
  productId: string
  userId: string
  desiredState: VoteState
  client?: RedisClient | null
  record?: PendingVoteRecord | null
  persistedState?: VoteState
}

export async function setDesiredVoteState({
  productId,
  userId,
  desiredState,
  client: providedClient,
  record: providedRecord,
  persistedState,
}: SetVoteStateOptions): Promise<{
  client: RedisClient | null
  state: VoteState
  persistedState: VoteState
}> {
  const { client, record } = await readStoredRecord(
    productId,
    userId,
    providedClient,
  )
  const existingRecord = providedRecord ?? record
  const effectivePersisted =
    persistedState ?? existingRecord?.persistedState ??
    (await fetchPersistedState(productId, userId))

  if (!client) {
    const finalState = await applyVoteDirectlyToDatabase({
      productId,
      userId,
      desiredState,
    })
    return {
      client: null,
      state: finalState,
      persistedState: finalState,
    }
  }

  const previous = existingRecord
  const nextRecord: PendingVoteRecord = {
    desiredState,
    persistedState: effectivePersisted,
    updatedAt: Date.now(),
  }

  const prevDelta = previous
    ? computeDelta(previous.desiredState, previous.persistedState)
    : 0
  const nextDelta = computeDelta(nextRecord.desiredState, nextRecord.persistedState)
  const deltaChange = nextDelta - prevDelta

  // If no change from persisted state and no stored record, skip.
  if (!previous && nextDelta === 0) {
    return {
      client,
      state: desiredState,
      persistedState: effectivePersisted,
    }
  }

  const hashKey = pendingVotesKey(productId)
  const deltaKey = pendingDeltaKey(productId)

  const multi = client.multi()

  if (nextDelta === 0) {
    if (previous) {
      multi.hDel(hashKey, userId)
    }
  } else {
    multi.hSet(hashKey, userId, encodeRecord(nextRecord))
    multi.sAdd(PENDING_PRODUCTS_KEY, productId)
  }

  if (deltaChange !== 0) {
    multi.incrBy(deltaKey, deltaChange)
  }

  await multi.exec()

  if (nextDelta === 0) {
    const remaining = await client.hLen(hashKey)
    if (remaining === 0) {
      await client.del(hashKey)
      await client.del(deltaKey)
      await client.sRem(PENDING_PRODUCTS_KEY, productId)
    }
  }

  return {
    client,
    state: desiredState,
    persistedState: effectivePersisted,
  }
}

export async function getPendingVoteDelta(
  productId: string,
  client?: RedisClient | null,
): Promise<number> {
  const resolvedClient = await getClient(client)
  if (!resolvedClient) return 0
  const raw = await resolvedClient.get(pendingDeltaKey(productId))
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getLiveUpvoteCount(
  productId: string,
  client?: RedisClient | null,
): Promise<number> {
  const [base, delta] = await Promise.all([
    fetchPersistedUpvoteCount(productId),
    getPendingVoteDelta(productId, client),
  ])
  const total = base + delta
  return total < 0 ? 0 : total
}

async function fetchPersistedUpvoteCount(productId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ upvotes: number }[]>`
    SELECT "upvotes"
    FROM "ProductAnalytics"
    WHERE "productId" = ${productId}
    LIMIT 1
  `
  const row = rows[0]
  return row?.upvotes ?? 0
}

interface DirectApplyOptions {
  productId: string
  userId: string
  desiredState: VoteState
}

async function applyVoteDirectlyToDatabase({
  productId,
  userId,
  desiredState,
}: DirectApplyOptions): Promise<VoteState> {
  const shouldUpvote = desiredState === "upvoted"

  if (shouldUpvote) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.productUpvote.findUnique({
        where: { productId_userId: { productId, userId } },
        select: { id: true },
      })

      if (existing) {
        return
      }

      await tx.productUpvote.create({
        data: { productId, userId },
        select: { id: true },
      })

      await tx.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { increment: 1 } },
        create: { productId, upvotes: 1, clicks: 0 },
        select: { productId: true },
      })
    })

    return "upvoted"
  }

  const shouldRemove = await prisma.$transaction(async (tx) => {
    const existing = await tx.productUpvote.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { id: true },
    })

    if (!existing) {
      return false
    }

    await tx.productUpvote.delete({
      where: { productId_userId: { productId, userId } },
    })

    await tx.productAnalytics.update({
      where: { productId },
      data: { upvotes: { decrement: 1 } },
      select: { productId: true },
    })

    return true
  })

  if (shouldRemove) {
    return "not_upvoted"
  }

  return desiredState
}

export async function listProductsWithPendingVotes(
  client?: RedisClient | null,
): Promise<string[]> {
  const resolvedClient = await getClient(client)
  if (!resolvedClient) return []
  return resolvedClient.sMembers(PENDING_PRODUCTS_KEY)
}

export async function getPendingVotesForProduct(
  productId: string,
  client?: RedisClient | null,
): Promise<Record<string, PendingVoteRecord>> {
  const resolvedClient = await getClient(client)
  if (!resolvedClient) return {}
  const raw = await resolvedClient.hGetAll(pendingVotesKey(productId))
  const result: Record<string, PendingVoteRecord> = {}
  for (const [userId, value] of Object.entries(raw)) {
    const record = decodeRecord(value)
    if (record) {
      result[userId] = record
    }
  }
  return result
}

export async function clearPendingVotes(
  productId: string,
  client?: RedisClient | null,
): Promise<void> {
  const resolvedClient = await getClient(client)
  if (!resolvedClient) return
  const hashKey = pendingVotesKey(productId)
  const deltaKey = pendingDeltaKey(productId)
  await resolvedClient.del(hashKey)
  await resolvedClient.del(deltaKey)
  await resolvedClient.sRem(PENDING_PRODUCTS_KEY, productId)
}

export interface FlushVotesResult {
  processedProductIds: string[]
  additions: number
  removals: number
}

export async function flushPendingVotesToDatabase(): Promise<FlushVotesResult> {
  const client = await getRedisClient()
  if (!client) {
    return { processedProductIds: [], additions: 0, removals: 0 }
  }

  const productIds = await listProductsWithPendingVotes(client)
  if (!productIds.length) {
    return { processedProductIds: [], additions: 0, removals: 0 }
  }

  const processedProductIds: string[] = []
  let totalAdditions = 0
  let totalRemovals = 0

  for (const productId of productIds) {
    const records = await getPendingVotesForProduct(productId, client)
    if (!Object.keys(records).length) {
      await clearPendingVotes(productId, client)
      continue
    }

    const additions: string[] = []
    const removals: string[] = []

    for (const [userId, record] of Object.entries(records)) {
      const delta = computeDelta(record.desiredState, record.persistedState)
      if (delta > 0) additions.push(userId)
      else if (delta < 0) removals.push(userId)
    }

    await prisma.$transaction(async (tx) => {
      if (additions.length) {
        await tx.productUpvote.createMany({
          data: additions.map((userId) => ({ productId, userId })),
          skipDuplicates: true,
        })
        await tx.productAnalytics.upsert({
          where: { productId },
          update: { upvotes: { increment: additions.length } },
          create: { productId, upvotes: additions.length, clicks: 0 },
        })
      }

      if (removals.length) {
        await tx.productUpvote.deleteMany({
          where: { productId, userId: { in: removals } },
        })
        await tx.$executeRaw`UPDATE "ProductAnalytics"
          SET "upvotes" = GREATEST("upvotes" - ${removals.length}, 0)
          WHERE "productId" = ${productId}`
      }
    })

    if (additions.length || removals.length) {
      processedProductIds.push(productId)
      totalAdditions += additions.length
      totalRemovals += removals.length
    }

    await clearPendingVotes(productId, client)
  }

  return { processedProductIds, additions: totalAdditions, removals: totalRemovals }
}
