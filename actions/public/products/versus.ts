import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
import { getLiveUpvoteCount } from "@/lib/server/productVotesStore"
import { hasUserUpvoted } from "./actions"

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
      orderBy: [
        { analytics: { upvotes: "desc" } },
        { createdAt: "desc" },
      ],
      take: limit,
      select: versusSelect,
      cacheStrategy: {
        ttl: DEFAULT_TTL.fast,
        swr: DEFAULT_SWR.fast,
        tags: accelerateTags([
          TAGS.products,
          TAGS.leaderboard,
          TAGS.analytics,
        ]),
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

export async function getVersusMatchup(options?: {
  excludeIds?: string[]
  clerkUserId?: string | null
}): Promise<VersusProduct[]> {
  const excludeIds = options?.excludeIds?.filter(Boolean) ?? []
  const excluded = new Set(excludeIds)
  const pool = await getVersusCandidatePool()
  const selected = pickRandomPair(pool, excluded)

  const uniqueProducts = Array.from(new Map(selected.map((p) => [p.id, p])).values())

  if (uniqueProducts.length < 2) {
    return []
  }

  const [first, second] = uniqueProducts

  const products = [first, second].filter(Boolean) as VersusPoolProduct[]

  const upvotePromises = products.map((product) =>
    getLiveUpvoteCount(product.id),
  )

  const upvotedPromises =
    options?.clerkUserId && products.length > 0
      ? products.map((product) =>
          hasUserUpvoted(product.id, options.clerkUserId!),
        )
      : products.map(async () => false)

  const [upvoteCounts, upvotedFlags] = await Promise.all([
    Promise.all(upvotePromises),
    Promise.all(upvotedPromises),
  ])

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
    upvoted: upvotedFlags[index] ?? false,
  }))
}
