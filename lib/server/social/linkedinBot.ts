import prisma from "@/lib/prisma"
import { getAppBaseUrl } from "@/lib/email/utils"
import { productPath } from "@/lib/routes"
import { buildCacheKey } from "@/lib/server/cache"
import { registerEventHandler } from "@/lib/server/events"
import { getRedisClient } from "@/lib/server/redis"

import {
  isLinkedInBotDryRun,
  isLinkedInBotEnabled,
  postLinkedInUpdate,
} from "./linkedinClient"
import {
  buildLinkedInBadgePost,
  buildLinkedInLeaderboardPost,
  buildLinkedInProductLaunchPost,
  extractLinkedInHandle,
} from "./linkedinMessages"

const POST_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const POST_TTL_SECONDS = Math.ceil(POST_TTL_MS / 1000)
const recentPosts = new Map<string, number>() // in-process fallback

function prune(now: number) {
  for (const [key, timestamp] of recentPosts) {
    if (now - timestamp > POST_TTL_MS) {
      recentPosts.delete(key)
    }
  }
}

async function canPost(key: string, now = Date.now()): Promise<boolean> {
  const cacheKey = buildCacheKey("linkedin", "post-throttle", key)
  const redis = await getRedisClient().catch(() => null)
  if (redis) {
    try {
      const result = await redis.set(cacheKey, `${now}`, {
        NX: true,
        EX: POST_TTL_SECONDS,
      })
      if (result === null) {
        return false
      }
      return true
    } catch (error) {
      console.warn("[linkedin] failed to persist throttle key", { error })
    }
  }

  prune(now)
  const previous = recentPosts.get(key)
  if (previous && now - previous < POST_TTL_MS) {
    return false
  }
  recentPosts.set(key, now)
  return true
}

async function releaseThrottle(key: string) {
  const cacheKey = buildCacheKey("linkedin", "post-throttle", key)
  const redis = await getRedisClient().catch(() => null)
  if (redis) {
    try {
      await redis.del(cacheKey)
    } catch (error) {
      console.warn("[linkedin] failed to clear throttle key", { error })
    }
  }
  recentPosts.delete(key)
}

function getProductUrl(slug: string): string {
  const base = getAppBaseUrl()
  return `${base}${productPath(slug)}`
}

async function handleProductPublished(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        status: true,
        metadata: {
          select: {
            twitterUrl: true,
          },
        },
      },
    })

    if (!product || product.status !== "published") {
      return
    }

    const key = `launch:${product.id}`
    if (!(await canPost(key))) {
      return
    }

    const post = await buildLinkedInProductLaunchPost({
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: getProductUrl(product.slug),
      twitterHandle: extractLinkedInHandle(product.metadata?.twitterUrl),
    })

    const result = await postLinkedInUpdate(post)
    if (!result.posted) {
      console.warn("[linkedin] failed to publish launch post", {
        productId,
        status: result.status,
        reason: result.reason,
        detail: result.detail,
      })
      await releaseThrottle(key)
    }
  } catch (error) {
    console.error("[linkedin] failed to handle product.published event", error)
    await releaseThrottle(`launch:${productId}`)
  }
}

async function handleBadgeAssigned(productId: string, badge: string) {
  if (!["trending", "featured", "editor-pick"].includes(badge)) {
    return
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        status: true,
        metadata: {
          select: {
            twitterUrl: true,
          },
        },
      },
    })

    if (!product || product.status !== "published") {
      return
    }

    const key = `${badge}:${product.id}`
    if (!(await canPost(key))) {
      return
    }

    const post = await buildLinkedInBadgePost({
      badge,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: getProductUrl(product.slug),
      twitterHandle: extractLinkedInHandle(product.metadata?.twitterUrl),
    })

    if (!post) {
      await releaseThrottle(key)
      return
    }

    const result = await postLinkedInUpdate(post)
    if (!result.posted) {
      console.warn("[linkedin] failed to publish badge post", {
        productId,
        badge,
        status: result.status,
        reason: result.reason,
        detail: result.detail,
      })
      await releaseThrottle(key)
    }
  } catch (error) {
    console.error("[linkedin] failed to handle badge.assigned event", error)
    await releaseThrottle(`${badge}:${productId}`)
  }
}

async function handleLeaderboardWinners(
  monthKey: string,
  monthLabel: string,
  leaderboardUrl: string,
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>,
) {
  try {
    if (!winners.length) {
      return
    }

    const key = `leaderboard:${monthKey}`
    if (!(await canPost(key))) {
      return
    }

    const post = await buildLinkedInLeaderboardPost({
      monthLabel,
      leaderboardUrl,
      winners,
    })

    const result = await postLinkedInUpdate(post)
    if (!result.posted) {
      console.warn("[linkedin] failed to publish leaderboard post", {
        monthKey,
        status: result.status,
        reason: result.reason,
        detail: result.detail,
      })
      await releaseThrottle(key)
    }
  } catch (error) {
    console.error(
      "[linkedin] failed to handle leaderboard.monthly.winners event",
      error,
    )
    await releaseThrottle(`leaderboard:${monthKey}`)
  }
}

async function handlePeriodicLeaderboardWinners(params: {
  periodKey: string
  periodLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}) {
  try {
    if (!params.winners.length) {
      return
    }

    const key = `leaderboard:${params.periodKey}`
    if (!(await canPost(key))) {
      return
    }

    const post = await buildLinkedInLeaderboardPost({
      monthLabel: params.periodLabel,
      leaderboardUrl: params.leaderboardUrl,
      winners: params.winners.map((winner) => ({
        rank: winner.rank,
        name: winner.name,
        twitterHandle: winner.twitterHandle,
      })),
    })

    const result = await postLinkedInUpdate(post)
    if (!result.posted) {
      console.warn("[linkedin] failed to publish periodic leaderboard post", {
        periodKey: params.periodKey,
        status: result.status,
        reason: result.reason,
        detail: result.detail,
      })
      await releaseThrottle(key)
    }
  } catch (error) {
    console.error(
      "[linkedin] failed to handle leaderboard.periodic.winners event",
      error,
    )
    await releaseThrottle(`leaderboard:${params.periodKey}`)
  }
}

function registerLinkedInBotListeners() {
  if (!isLinkedInBotEnabled() && !isLinkedInBotDryRun()) {
    console.warn(
      "[linkedin] listeners registered but bot is missing credentials; posts will no-op until configured.",
    )
  }

  registerEventHandler({
    event: "product.published",
    id: "linkedin.product-published",
    mode: "async",
    queue: "low",
    handler: ({ productId }) => handleProductPublished(productId),
  })

  registerEventHandler({
    event: "badge.assigned",
    id: "linkedin.badge-assigned",
    mode: "async",
    queue: "low",
    handler: ({ productId, badge }) => handleBadgeAssigned(productId, badge),
  })

  registerEventHandler({
    event: "leaderboard.monthly.winners",
    id: "linkedin.leaderboard-winners",
    mode: "async",
    queue: "low",
    handler: ({ monthKey, monthLabel, leaderboardUrl, winners }) =>
      handleLeaderboardWinners(monthKey, monthLabel, leaderboardUrl, winners),
  })

  registerEventHandler({
    event: "leaderboard.periodic.winners",
    id: "linkedin.leaderboard-periodic-winners",
    mode: "async",
    queue: "low",
    handler: ({ periodKey, periodLabel, leaderboardUrl, winners }) =>
      handlePeriodicLeaderboardWinners({
        periodKey,
        periodLabel,
        leaderboardUrl,
        winners: winners.map(
          (winner: {
            rank: number
            name: string
            twitterHandle?: string | null
          }) => ({
            rank: winner.rank,
            name: winner.name,
            twitterHandle: winner.twitterHandle,
          }),
        ),
      }),
  })
}

registerLinkedInBotListeners()

export function _internalLinkedInThrottle() {
  return {
    canPost,
    recentPosts,
  }
}
