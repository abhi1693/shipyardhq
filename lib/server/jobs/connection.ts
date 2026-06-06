import type { ConnectionOptions } from "bullmq"
import Redis, { type RedisOptions } from "ioredis"

type BullMqConnectionRole = "producer" | "worker"

const DEFAULT_BULLMQ_PREFIX = "shipyardhq"

type SentinelNode = {
  host: string
  port: number
}

export function getBullMqPrefix(): string {
  return process.env.BULLMQ_PREFIX?.trim() || DEFAULT_BULLMQ_PREFIX
}

export function createBullMqConnection(
  role: BullMqConnectionRole,
): ConnectionOptions {
  const commonOptions = buildCommonOptions(role)
  const sentinelName = process.env.REDIS_SENTINEL_NAME?.trim()
  const sentinels = parseSentinelNodes()

  if (sentinelName && sentinels.length > 0) {
    return toBullMqConnection(
      new Redis({
        ...commonOptions,
        name: sentinelName,
        sentinels,
        db: parseNonNegativeInteger(process.env.REDIS_DB),
      }),
    )
  }

  const redisUrl = resolveRedisUrl()
  if (redisUrl) {
    return toBullMqConnection(new Redis(redisUrl, commonOptions))
  }

  throw new Error(
    "BullMQ requires REDIS_URL, REDIS_TLS_URL, or REDIS_SENTINEL_NAME with REDIS_SENTINEL_NODES",
  )
}

function toBullMqConnection(redis: Redis): ConnectionOptions {
  return redis as unknown as ConnectionOptions
}

function buildCommonOptions(role: BullMqConnectionRole): RedisOptions {
  return {
    connectionName: `shipyardhq-bullmq-${role}`,
    enableOfflineQueue: role === "worker",
    maxRetriesPerRequest: role === "worker" ? null : 1,
  }
}

function resolveRedisUrl(): string | null {
  return (
    process.env.REDIS_URL?.trim() || process.env.REDIS_TLS_URL?.trim() || null
  )
}

function parseNonNegativeInteger(
  value: string | undefined,
): number | undefined {
  if (!value?.trim()) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function parseSentinelNodes(): SentinelNode[] {
  return (
    process.env.REDIS_SENTINEL_NODES?.split(",")
      .map((node) => node.trim())
      .filter(Boolean)
      .map((node) => {
        const [host, port] = node.split(":")
        return {
          host,
          port: Number.parseInt(port || "26379", 10),
        }
      })
      .filter(
        (node): node is SentinelNode =>
          Boolean(node.host) && Number.isInteger(node.port),
      ) ?? []
  )
}
