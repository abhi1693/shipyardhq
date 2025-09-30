import prisma from "@/lib/prisma"
import { getAppBaseUrl } from "@/lib/email/utils"
import { productPath } from "@/lib/routes"
import { on } from "@/lib/server/events"

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

    const tweet = buildProductLaunchTweet({
      name: product.name,
      tagline: product.tagline,
      url: getProductUrl(product.slug),
      twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
    })

    await postTweet(tweet)
  } catch (error) {
    console.error("[twitter] failed to handle product.published event", error)
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

    const tweet = buildBadgeTweet({
      badge,
      name: product.name,
      tagline: product.tagline,
      url: getProductUrl(product.slug),
      twitterHandle: extractTwitterHandle(product.metadata?.twitterUrl),
    })

    if (!tweet) {
      return
    }

    await postTweet(tweet)
  } catch (error) {
    console.error("[twitter] failed to handle badge.assigned event", error)
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

    const tweet = buildLeaderboardTweet({
      monthLabel,
      leaderboardUrl,
      winners,
    })

    await postTweet(tweet)
  } catch (error) {
    console.error(
      "[twitter] failed to handle leaderboard.monthly.winners event",
      error,
    )
  }
}

function registerTwitterBotListeners() {
  if (!isTwitterBotActive()) {
    return
  }

  if (!isTwitterBotEnabled() && !isTwitterBotDryRun()) {
    return
  }

  on("product.published", ({ productId }) => handleProductPublished(productId))
  on("badge.assigned", ({ productId, badge }) =>
    handleBadgeAssigned(productId, badge),
  )
  on("leaderboard.monthly.winners", ({
    monthKey,
    monthLabel,
    leaderboardUrl,
    winners,
  }) =>
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
  )
}

registerTwitterBotListeners()

export function _internalTwitterThrottle() {
  return {
    canPost,
    recentPosts,
  }
}
