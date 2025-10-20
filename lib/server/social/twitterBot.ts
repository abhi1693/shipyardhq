import prisma from "@/lib/prisma"
import { getAppBaseUrl } from "@/lib/email/utils"
import { productPath } from "@/lib/routes"
import { registerEventHandler } from "@/lib/server/events"

import {
  isTwitterBotActive,
  isTwitterBotEnabled,
  isTwitterBotDryRun,
  postTweet,
} from "./twitterClient"
import {
  buildBadgeTweet,
  buildLeaderboardTweet,
  buildProductLaunchTweet,
  extractTwitterHandle,
} from "./twitterMessages"

const POST_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const recentPosts = new Map<string, number>()

function prune(now: number) {
  for (const [key, timestamp] of recentPosts) {
    if (now - timestamp > POST_TTL_MS) {
      recentPosts.delete(key)
    }
  }
}

function canPost(key: string, now = Date.now()): boolean {
  prune(now)
  const previous = recentPosts.get(key)
  if (previous && now - previous < POST_TTL_MS) {
    return false
  }
  recentPosts.set(key, now)
  return true
}

function releaseThrottle(key: string) {
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
    if (!canPost(key)) {
      return
    }

    const tweet = await buildProductLaunchTweet({
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: getProductUrl(product.slug),
      twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
    })

    const result = await postTweet(tweet)
    if (!result.posted) {
      releaseThrottle(key)
    }
  } catch (error) {
    console.error("[twitter] failed to handle product.published event", error)
    releaseThrottle(`launch:${productId}`)
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
    if (!canPost(key)) {
      return
    }

    const tweet = await buildBadgeTweet({
      badge,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: getProductUrl(product.slug),
      twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
    })

    if (!tweet) {
      releaseThrottle(key)
      return
    }

    const result = await postTweet(tweet)
    if (!result.posted) {
      releaseThrottle(key)
    }
  } catch (error) {
    console.error("[twitter] failed to handle badge.assigned event", error)
    releaseThrottle(`${badge}:${productId}`)
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
    if (!canPost(key)) {
      return
    }

    const tweet = await buildLeaderboardTweet({
      monthLabel,
      leaderboardUrl,
      winners,
    })

    const result = await postTweet(tweet)
    if (!result.posted) {
      releaseThrottle(key)
    }
  } catch (error) {
    console.error(
      "[twitter] failed to handle leaderboard.monthly.winners event",
      error,
    )
    releaseThrottle(`leaderboard:${monthKey}`)
  }
}

function registerTwitterBotListeners() {
  if (!isTwitterBotActive()) {
    return
  }

  if (!isTwitterBotEnabled() && !isTwitterBotDryRun()) {
    return
  }

  registerEventHandler({
    event: "product.published",
    id: "twitter.product-published",
    mode: "async",
    queue: "low",
    handler: ({ productId }) => handleProductPublished(productId),
  })

  registerEventHandler({
    event: "badge.assigned",
    id: "twitter.badge-assigned",
    mode: "async",
    queue: "low",
    handler: ({ productId, badge }) => handleBadgeAssigned(productId, badge),
  })

  registerEventHandler({
    event: "leaderboard.monthly.winners",
    id: "twitter.leaderboard-winners",
    mode: "async",
    queue: "low",
    handler: ({ monthKey, monthLabel, leaderboardUrl, winners }) =>
      handleLeaderboardWinners(
        monthKey,
        monthLabel,
        leaderboardUrl,
        winners.map((winner) => ({
          rank: winner.rank,
          name: winner.name,
          twitterHandle: winner.twitterHandle,
        })),
      ),
  })
}

registerTwitterBotListeners()

export function _internalTwitterThrottle() {
  return {
    canPost,
    recentPosts,
  }
}
