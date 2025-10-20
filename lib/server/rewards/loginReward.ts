import prisma from "@/lib/prisma"
import { awardRewards } from "@/lib/rewards/engine"
import { RewardsError } from "@/lib/rewards/errors"
import {
  dispatchEventAsync,
  registerEventHandler,
  type RewardsDailyLoginEvent,
} from "@/lib/server/events"
import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

const LOGIN_RULE_KEY = "rewards.login.daily"
const NON_FATAL_CODES = new Set([
  "COOLDOWN_ACTIVE",
  "CAP_EXCEEDED",
  "RULE_NOT_FOUND",
  "RULE_INACTIVE",
])

const CACHE_SYMBOL = Symbol.for("__shipyard_login_reward_cache")
const ACTIVE_ENVELOPE_STATUSES: EventEnvelopeStatus[] = [
  "pending",
  "processing",
  "retrying",
]

type LoginRewardCache = Map<string, string>

function getCache(): LoginRewardCache {
  const globalWithCache = globalThis as typeof globalThis & {
    [CACHE_SYMBOL]?: LoginRewardCache
  }
  if (!globalWithCache[CACHE_SYMBOL]) {
    globalWithCache[CACHE_SYMBOL] = new Map()
  }
  return globalWithCache[CACHE_SYMBOL]!
}

type EnsureDailyLoginRewardOptions = {
  now?: Date
}

export async function ensureDailyLoginReward(
  userId: string,
  options: EnsureDailyLoginRewardOptions = {},
) {
  if (!userId) return

  const now = options.now ?? new Date()
  const dayKey = now.toISOString().slice(0, 10)
  const cache = getCache()
  if (cache.get(userId) === dayKey) {
    return
  }

  const eventId = `${dayKey}:login`
  const payload: RewardsDailyLoginEvent = {
    userId,
    eventId,
    dayKey,
    awardedAt: now.toISOString(),
  }

  const alreadyQueued = await hasQueuedDailyLoginEvent(userId, eventId, dayKey)
  if (alreadyQueued) {
    cache.set(userId, dayKey)
    return
  }

  const alreadyAwarded = await hasAwardedDailyLoginReward(userId, eventId)
  if (alreadyAwarded) {
    cache.set(userId, dayKey)
    return
  }

  dispatchEventAsync("rewards.daily-login", payload, {
    context: { userId, eventId },
    onError: (error) => {
      console.error("[rewards] Failed to enqueue daily login rewards", {
        error,
        userId,
        eventId,
      })
    },
  })
}

export async function handleDailyLoginRewardEvent(
  payload: RewardsDailyLoginEvent,
) {
  try {
    await awardRewards(payload.userId, LOGIN_RULE_KEY, {
      eventId: payload.eventId,
      sourceType: "auth.login",
      sourceId: payload.eventId,
      targetType: "user",
      targetId: payload.userId,
      metadata: {
        awardedAt: payload.awardedAt,
        dayKey: payload.dayKey,
      },
    })
    const cache = getCache()
    cache.set(payload.userId, payload.dayKey)
  } catch (error) {
    if (error instanceof RewardsError && NON_FATAL_CODES.has(error.code)) {
      if (error.code === "RULE_NOT_FOUND" || error.code === "RULE_INACTIVE") {
        console.warn("[rewards] Daily login rule unavailable", {
          userId: payload.userId,
          code: error.code,
        })
      }
      return
    }

    console.error("[rewards] Failed to award daily login rewards", {
      error,
      userId: payload.userId,
      eventId: payload.eventId,
    })
  }
}

registerEventHandler({
  event: "rewards.daily-login",
  id: "rewards.daily-login",
  mode: "async",
  handler: handleDailyLoginRewardEvent,
})

async function hasAwardedDailyLoginReward(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const existing = await prisma.rewardTransaction.findFirst({
    where: {
      userId,
      ruleKey: LOGIN_RULE_KEY,
      eventId,
    },
    select: { id: true },
  })
  return Boolean(existing)
}

async function hasQueuedDailyLoginEvent(
  userId: string,
  eventId: string,
  dayKey: string,
): Promise<boolean> {
  const existing = await prisma.eventEnvelope.findFirst({
    where: {
      event: "rewards.daily-login",
      status: { in: ACTIVE_ENVELOPE_STATUSES },
      AND: [
        {
          payload: {
            path: ["userId"],
            equals: userId,
          },
        },
        {
          payload: {
            path: ["eventId"],
            equals: eventId,
          },
        },
        {
          payload: {
            path: ["dayKey"],
            equals: dayKey,
          },
        },
      ],
    },
    select: { id: true },
  })
  return Boolean(existing)
}
