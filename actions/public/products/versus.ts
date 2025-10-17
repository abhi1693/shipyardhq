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

function shuffleProducts(products: VersusPoolProduct[]): VersusPoolProduct[] {
  const array = [...products]
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[array[index], array[randomIndex]] = [array[randomIndex]!, array[index]!]
  }
  return array
}

async function getUserUpvoteSet(
  productIds: string[],
  clerkUserId?: string | null,
): Promise<{ activeUserId: string | null; persistedUpvotes: Set<string> }> {
  if (!clerkUserId || productIds.length === 0) {
    return { activeUserId: null, persistedUpvotes: new Set<string>() }
  }

  const activeUser = await getActiveUserByClerkId(clerkUserId)
  if (!activeUser) {
    return { activeUserId: null, persistedUpvotes: new Set<string>() }
  }

  const rows = await prisma.productUpvote.findMany({
    where: {
      userId: activeUser.id,
      productId: { in: Array.from(new Set(productIds)) },
    },
    select: { productId: true },
  })

  return {
    activeUserId: activeUser.id,
    persistedUpvotes: new Set(rows.map((row) => row.productId)),
  }
}

export async function getVersusMatchup(options?: {
  excludeIds?: string[]
  clerkUserId?: string | null
}): Promise<VersusProduct[]> {
  const excludeIds = options?.excludeIds?.filter(Boolean) ?? []
  const excluded = new Set(excludeIds)
  const pool = await getVersusCandidatePool()

  if (pool.length < 2) {
    return []
  }

  const { activeUserId, persistedUpvotes } = await getUserUpvoteSet(
    pool.map((product) => product.id),
    options?.clerkUserId,
  )

  const filterBy = (products: VersusPoolProduct[]) =>
    products.filter((product) => !excluded.has(product.id))

  const filterFresh = (products: VersusPoolProduct[]) =>
    persistedUpvotes.size > 0
      ? products.filter((product) => !persistedUpvotes.has(product.id))
      : products

  let candidatePool = filterFresh(filterBy(pool))
  if (candidatePool.length < 2) {
    candidatePool = filterFresh(pool)
  }

  if (candidatePool.length < 2) {
    return []
  }

  const shuffled = shuffleProducts(candidatePool)
  const voteStateCache = new Map<string, boolean>()
  type VoteResolution = Awaited<ReturnType<typeof resolveVoteState>>
  let sharedClient: VoteResolution["client"] = null

  const isCurrentlyUpvoted = async (productId: string) => {
    if (!activeUserId) return false
    if (voteStateCache.has(productId)) {
      return voteStateCache.get(productId)!
    }

    const resolution = await resolveVoteState(
      productId,
      activeUserId,
      sharedClient ?? undefined,
    )

    sharedClient = resolution.client ?? sharedClient
    const flag = resolution.currentState === "upvoted"
    voteStateCache.set(productId, flag)
    return flag
  }

  let selected: VersusPoolProduct[] | null = null

  for (let index = 0; index < shuffled.length; index += 1) {
    const first = shuffled[index]!
    if (await isCurrentlyUpvoted(first.id)) {
      continue
    }

    for (let inner = index + 1; inner < shuffled.length; inner += 1) {
      const second = shuffled[inner]!
      if (await isCurrentlyUpvoted(second.id)) {
        continue
      }
      selected = [first, second]
      break
    }

    if (selected) {
      break
    }
  }

  if (!selected) {
    return []
  }

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
    upvoted:
      voteStateCache.get(product.id) ??
      (persistedUpvotes.size > 0 ? persistedUpvotes.has(product.id) : false),
  }))
}
