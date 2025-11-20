"use server"

import prisma from "@/lib/prisma"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { selectBalancedProductUpdates } from "@/lib/product-updates/feed"
import { Prisma, ProductUpdateStatus } from "@/lib/vendor/prisma/client"
import type {
  ProductUpdateFeedItem,
  ProductUpdatePublicView,
} from "@/types/product-updates"

const publicUpdateSelect = {
  id: true,
  title: true,
  summary: true,
  content: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      tagline: true,
    },
  },
} as const

type PublicProductUpdate = Prisma.ProductUpdateGetPayload<{
  select: typeof publicUpdateSelect
}>

function formatPublicUpdate(
  update: PublicProductUpdate,
): ProductUpdatePublicView {
  const authorName =
    update.author && (update.author.firstName || update.author.lastName)
      ? [update.author.firstName ?? "", update.author.lastName ?? ""]
          .join(" ")
          .trim()
      : null

  return {
    id: update.id,
    title: update.title,
    summary: update.summary ?? null,
    content: update.content,
    publishedAt: update.publishedAt?.toISOString() ?? null,
    createdAt: update.createdAt.toISOString(),
    updatedAt: update.updatedAt.toISOString(),
    author: update.author
      ? {
          id: update.author.id,
          firstName: update.author.firstName,
          lastName: update.author.lastName,
          displayName: authorName || null,
        }
      : null,
    product: update.product
      ? {
          id: update.product.id,
          name: update.product.name,
          slug: update.product.slug,
          logo: update.product.logo,
          tagline: update.product.tagline,
        }
      : null,
  }
}

function formatFeedItem(
  update: PublicProductUpdate,
): ProductUpdateFeedItem | null {
  const formatted = formatPublicUpdate(update)
  if (!formatted.product) return null
  return {
    id: formatted.id,
    title: formatted.title,
    summary: formatted.summary,
    publishedAt: formatted.publishedAt,
    createdAt: formatted.createdAt,
    product: formatted.product,
  }
}

type FetchOptions = {
  limit?: number
  skip?: number
}

async function fetchPublicProductUpdates(
  productId: string,
  options: FetchOptions = {},
): Promise<ProductUpdatePublicView[]> {
  const { limit, skip } = options

  const query: Prisma.ProductUpdateFindManyArgs = {
    where: {
      productId,
      status: ProductUpdateStatus.published,
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: publicUpdateSelect,
  }

  if (typeof skip === "number" && skip > 0) {
    query.skip = skip
  }

  if (typeof limit === "number") {
    query.take = limit
  }

  const updates = await prisma.productUpdate.findMany(query)

  type ProductUpdateRecord = (typeof updates)[number]
  return updates.map((update: ProductUpdateRecord) =>
    formatPublicUpdate(update as unknown as PublicProductUpdate),
  )
}

export const getPublicProductUpdates = cached(
  async (productId: string, options?: { limit?: number }) =>
    fetchPublicProductUpdates(productId, options ?? {}),
  "product:public:updates",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([productId]) => [
      TAGS.products,
      TAGS.product(String(productId)),
      TAGS.productUpdates(String(productId)),
    ],
    keyParts: ([, options]) =>
      options?.limit != null ? [`limit:${options.limit}`] : [],
  },
)

async function fetchLatestPublishedUpdates(
  limit: number,
): Promise<ProductUpdateFeedItem[]> {
  const safeLimit = Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 6)
  const take = Math.min(Math.max(safeLimit * 3, safeLimit + 6), 60)

  const updates = await prisma.productUpdate.findMany({
    where: {
      status: ProductUpdateStatus.published,
      publishedAt: { not: null },
      product: { status: { not: "archived" } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take,
    select: publicUpdateSelect,
  })

  const feedItems = updates
    .map((update: (typeof updates)[number]) =>
      formatFeedItem(update as unknown as PublicProductUpdate),
    )
    .filter(
      (
        item: ProductUpdateFeedItem | undefined,
      ): item is ProductUpdateFeedItem => Boolean(item),
    )

  return selectBalancedProductUpdates(feedItems, safeLimit)
}

export const getLatestPublicProductUpdates = cached(
  async (limit: number) => fetchLatestPublishedUpdates(limit),
  "product:public:updates:latest",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => [TAGS.productUpdatesLatest],
    keyParts: ([limit]) => [`limit:${limit}`],
  },
)

export async function getPublicProductUpdatesPage(
  productId: string,
  page: number,
  pageSize: number,
) {
  const normalizedPage = Number.isFinite(page) ? Math.floor(page) : 0
  const safePage = normalizedPage > 0 ? normalizedPage : 0
  const normalizedSize = Number.isFinite(pageSize) ? Math.floor(pageSize) : 10
  const safePageSize = Math.max(1, Math.min(normalizedSize, 20))
  const skip = safePage * safePageSize

  const updates = await fetchPublicProductUpdates(productId, {
    limit: safePageSize + 1,
    skip,
  })

  const hasMore = updates.length > safePageSize
  const slice = hasMore ? updates.slice(0, safePageSize) : updates

  return {
    updates: slice,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
  }
}
