import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
import {
  getLiveUpvoteCount,
  resolveVoteState,
} from "@/lib/server/productVotesStore"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

const VERSUS_POOL_LIMIT = 48

const versusSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  logo: true,
  websiteUrl: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  analytics: {
    select: {
      upvotes: true,
    },
  },
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const

type VersusPoolProduct = {
  id: string
  slug: string
  name: string
  tagline: string
  logo: string
  websiteUrl: string | null
  category?: {
    name: string | null
    slug: string | null
  } | null
  analytics?: {
    upvotes: number | null
  } | null
  user?: {
    firstName: string | null
    lastName: string | null
  } | null
} & Record<string, unknown>

export interface VersusProduct {
  id: string
  slug: string
  name: string
  tagline: string
  logo: string
  websiteUrl: string | null
  category?: {
    name: string | null
    slug: string | null
  } | null
  upvotes: number
  makerName: string | null
  upvoted: boolean
}

export const getVersusCandidatePool = cached(
  async (limit = VERSUS_POOL_LIMIT): Promise<VersusPoolProduct[]> =>
    prisma.product.findMany({
      where: {
        status: "published",
      },
      orderBy: [{ analytics: { upvotes: "desc" } }, { createdAt: "desc" }],
      take: limit,
      select: versusSelect,
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([TAGS.products, TAGS.leaderboard, TAGS.analytics]),
      },
    }) as Promise<VersusPoolProduct[]>,
  "products:versus-pool",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.products, TAGS.leaderboard, TAGS.analytics],
  },
)

function pickRandomPair(
  pool: VersusPoolProduct[],
  excluded: Set<string>,
): VersusPoolProduct[] {
  if (pool.length === 0) return []

  const available = pool.filter((product) => !excluded.has(product.id))
  const candidates = available.length >= 2 ? available : pool

  if (candidates.length === 1) {
    return [candidates[0]]
  }

  const firstIndex = Math.floor(Math.random() * candidates.length)
  let secondIndex = Math.floor(Math.random() * candidates.length)

  if (candidates.length > 1) {
    while (secondIndex === firstIndex) {
      secondIndex = Math.floor(Math.random() * candidates.length)
    }
  }

  return [candidates[firstIndex]!, candidates[secondIndex]!]
}

async function buildUserVoteMap(
  productIds: string[],
  clerkUserId?: string | null,
): Promise<Map<string, boolean> | null> {
  if (!clerkUserId || productIds.length === 0) {
    return null
  }

  const activeUser = await getActiveUserByClerkId(clerkUserId)
  if (!activeUser) {
    return null
  }

  const uniqueIds = Array.from(new Set(productIds))
  const voteMap = new Map<string, boolean>()
  let redisClient: Awaited<ReturnType<typeof resolveVoteState>>["client"] = null

  for (const productId of uniqueIds) {
    const resolution = await resolveVoteState(
      productId,
      activeUser.id,
      redisClient ?? undefined,
    )
    redisClient = resolution.client ?? redisClient
    voteMap.set(productId, resolution.currentState === "upvoted")
  }

  return voteMap
}

export async function getVersusMatchup(options?: {
  excludeIds?: string[]
  clerkUserId?: string | null
}): Promise<VersusProduct[]> {
  const excludeIds = options?.excludeIds?.filter(Boolean) ?? []
  const excluded = new Set(excludeIds)
  const pool = await getVersusCandidatePool()
  const userVoteMap =
    (await buildUserVoteMap(
      pool.map((product) => product.id),
      options?.clerkUserId,
    )) ?? null

  const filterFreshCandidates = (products: VersusPoolProduct[]) =>
    userVoteMap
      ? products.filter((product) => !userVoteMap.get(product.id))
      : products

  const filteredByExclusions = pool.filter(
    (product) => !excluded.has(product.id),
  )

  let candidatePool =
    filteredByExclusions.length >= 2 ? filteredByExclusions : pool
  candidatePool = filterFreshCandidates(candidatePool)

  if (candidatePool.length < 2 && userVoteMap) {
    const freshFallback = filterFreshCandidates(pool)
    if (freshFallback.length >= 2) {
      candidatePool = freshFallback
    }
  }

  if (candidatePool.length < 2) {
    return []
  }

  const selected = pickRandomPair(candidatePool, excluded)

  const uniqueProducts = Array.from(
    new Map(selected.map((p) => [p.id, p])).values(),
  )

  if (uniqueProducts.length < 2) {
    return []
  }

  const [first, second] = uniqueProducts

  const products = [first, second].filter(Boolean) as VersusPoolProduct[]

  const upvotePromises = products.map((product) =>
    getLiveUpvoteCount(product.id),
  )

  const upvoteCounts = await Promise.all(upvotePromises)

  return products.map((product, index) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    logo: product.logo,
    websiteUrl: product.websiteUrl ?? null,
    category: product.category,
    upvotes: upvoteCounts[index] ?? product.analytics?.upvotes ?? 0,
    makerName: (() => {
      const parts = [
        product.user?.firstName?.trim(),
        product.user?.lastName?.trim(),
      ].filter(Boolean)
      return parts.length ? parts.join(" ") : null
    })(),
    upvoted: userVoteMap?.get(product.id) ?? false,
  }))
}
