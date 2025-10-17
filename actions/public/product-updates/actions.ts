"use server"

import prisma from "@/lib/prisma"
import {
  accelerateTags,
  cached,
  DEFAULT_SWR,
  DEFAULT_TTL,
  TAGS,
} from "@/lib/cache"
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

async function fetchPublicProductUpdates(
  productId: string,
): Promise<ProductUpdatePublicView[]> {
  const updates = await prisma.productUpdate.findMany({
    where: {
      productId,
      status: ProductUpdateStatus.published,
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: publicUpdateSelect,
    cacheStrategy: {
      ttl: DEFAULT_TTL.medium,
      swr: DEFAULT_SWR.medium,
      tags: accelerateTags([
        TAGS.products,
        TAGS.product(productId),
        TAGS.productUpdates(productId),
      ]),
    },
  })

  return updates.map((update) =>
    formatPublicUpdate(update as unknown as PublicProductUpdate),
  )
}

export const getPublicProductUpdates = cached(
  async (productId: string) => fetchPublicProductUpdates(productId),
  "product:public:updates",
  {
    ttl: DEFAULT_TTL.medium,
    tags: ([productId]) =>
      accelerateTags([
        TAGS.products,
        TAGS.product(productId),
        TAGS.productUpdates(productId),
      ]),
  },
)

async function fetchLatestPublishedUpdates(
  limit: number,
): Promise<ProductUpdateFeedItem[]> {
  const updates = await prisma.productUpdate.findMany({
    where: {
      status: ProductUpdateStatus.published,
      publishedAt: { not: null },
      product: { status: { not: "archived" } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: publicUpdateSelect,
    cacheStrategy: {
      ttl: DEFAULT_TTL.fast,
      swr: DEFAULT_SWR.fast,
      tags: accelerateTags([TAGS.productUpdatesLatest, TAGS.products]),
    },
  })

  return updates
    .map((update) => formatFeedItem(update as unknown as PublicProductUpdate))
    .filter((item): item is ProductUpdateFeedItem => Boolean(item))
}

export const getLatestPublicProductUpdates = cached(
  async (limit: number) => fetchLatestPublishedUpdates(limit),
  "product:public:updates:latest",
  {
    ttl: DEFAULT_TTL.fast,
    tags: () => accelerateTags([TAGS.productUpdatesLatest]),
    keyParts: ([limit]) => [`limit:${limit}`],
  },
)
