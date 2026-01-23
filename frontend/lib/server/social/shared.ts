import prisma from "@/lib/prisma"
import { getAppBaseUrl } from "@/lib/email/utils"
import { productPath } from "@/lib/routes"

const TWITTER_HANDLE_REGEX = /^[A-Za-z0-9_]{1,15}$/

export type PeriodCadence = "day" | "week" | "month"

export type SocialProduct = {
  id: string
  name: string
  slug: string
  tagline: string
  twitterHandle?: string | null
}

export type SocialWinner = {
  rank: number
  name: string
  twitterHandle?: string | null
}

export function normalizeTwitterHandle(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.length) return null

  // Allow full profile URLs (twitter.com/x.com) or bare handles (with/without @).
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]{1,15})/i,
  )
  if (match?.[1]) {
    return `@${match[1]}`
  }

  const direct = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed
  if (TWITTER_HANDLE_REGEX.test(direct)) {
    return `@${direct}`
  }

  return null
}

export function formatDisplayName(
  name: string,
  handle?: string | null,
): string {
  const formatted = normalizeTwitterHandle(handle)
  return formatted ? `${name} (${formatted})` : name
}

export function rankEmoji(rank: number): string {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `#${rank}`
}

export function normalizeWinners(
  winners: Array<SocialWinner>,
): Array<SocialWinner> {
  return [...winners]
    .sort((a, b) => a.rank - b.rank)
    .map((winner) => ({
      rank: winner.rank,
      name: winner.name,
      twitterHandle: normalizeTwitterHandle(winner.twitterHandle),
    }))
}

export function buildProductUrl(slug: string): string {
  const base = getAppBaseUrl()
  return `${base}${productPath(slug)}`
}

export async function loadPublishedProductForSocial(
  productId: string,
): Promise<SocialProduct | null> {
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
    return null
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    twitterHandle: normalizeTwitterHandle(product.metadata?.twitterUrl),
  }
}
