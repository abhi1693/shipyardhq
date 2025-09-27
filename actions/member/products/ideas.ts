"use server"

import {
  crawlProductWebsite,
  discoverProductSubreddits,
  synthesizeProductIdea,
} from "@/lib/server/productIdeas"
import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { ProductIdeaProfileStatus, Prisma } from "@/lib/vendor/prisma/client"
import type {
  ProductIdeaProfileView,
  ProductIdeaSubreddit,
  ProductIdeaSubredditQuery,
  SerializedIdeaProfile,
} from "@/types/product-ideas"
import { buildProductIdeaSummaryText } from "@/lib/server/productIdeas/summary"
import type {
  ProductIdeaPageSnapshot,
  ProductIdeaProductContext,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"

const ideaProfileSelect = {
  id: true,
  productId: true,
  sitemapUrl: true,
  discoveredUrls: true,
  pages: true,
  summary: true,
  summaryText: true,
  subredditQueries: true,
  subreddits: true,
  subredditStatus: true,
  subredditErrorMessage: true,
  subredditModel: true,
  status: true,
  errorMessage: true,
  model: true,
  lastSubredditDiscoveryAt: true,
  lastCrawledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductIdeaProfileSelect

type IdeaProfileRecord = Prisma.ProductIdeaProfileGetPayload<{
  select: typeof ideaProfileSelect
}>

function serializeIdeaProfile(
  record: IdeaProfileRecord | null,
): SerializedIdeaProfile | null {
  if (!record) return null
  const discoveredUrls = Array.isArray(record.discoveredUrls)
    ? (record.discoveredUrls as unknown[]).filter(
        (value): value is string => typeof value === "string",
      )
    : null
  const pages = Array.isArray(record.pages)
    ? (record.pages as unknown[] as ProductIdeaPageSnapshot[])
    : null
  const summary = record.summary ? (record.summary as ProductIdeaSummary) : null
  const subredditQueries = Array.isArray(record.subredditQueries)
    ? (record.subredditQueries as unknown[]).reduce<ProductIdeaSubredditQuery[]>(
        (acc, value) => {
          if (
            value !== null &&
            typeof value === "object" &&
            typeof (value as any).query === "string"
          ) {
            acc.push({
              query: (value as any).query,
              rationale:
                typeof (value as any).rationale === "string"
                  ? (value as any).rationale
                  : null,
              audience:
                typeof (value as any).audience === "string"
                  ? (value as any).audience
                  : null,
            })
          }
          return acc
        },
        [],
      )
    : null
  const subreddits = Array.isArray(record.subreddits)
    ? (record.subreddits as unknown[]).reduce<ProductIdeaSubreddit[]>(
        (acc, value) => {
          if (
            value !== null &&
            typeof value === "object" &&
            typeof (value as any).name === "string" &&
            typeof (value as any).url === "string"
          ) {
            acc.push({
              id:
                typeof (value as any).id === "string"
                  ? (value as any).id
                  : null,
              name: (value as any).name,
              title:
                typeof (value as any).title === "string"
                  ? (value as any).title
                  : null,
              description:
                typeof (value as any).description === "string"
                  ? (value as any).description
                  : null,
              url: (value as any).url,
              subscribers:
                typeof (value as any).subscribers === "number"
                  ? (value as any).subscribers
                  : null,
              activeUserCount:
                typeof (value as any).activeUserCount === "number"
                  ? (value as any).activeUserCount
                  : null,
              over18:
                typeof (value as any).over18 === "boolean"
                  ? (value as any).over18
                  : null,
              iconUrl:
                typeof (value as any).iconUrl === "string"
                  ? (value as any).iconUrl
                  : null,
              primaryTopic:
                typeof (value as any).primaryTopic === "string"
                  ? (value as any).primaryTopic
                  : null,
              score:
                typeof (value as any).score === "number"
                  ? (value as any).score
                  : null,
              matchedQueries: Array.isArray((value as any).matchedQueries)
                ? ((value as any).matchedQueries as unknown[]).filter(
                    (q): q is string => typeof q === "string",
                  )
                : null,
              relevanceScore:
                typeof (value as any).relevanceScore === "number"
                  ? (value as any).relevanceScore
                  : null,
              relevanceReason:
                typeof (value as any).relevanceReason === "string"
                  ? (value as any).relevanceReason
                  : null,
            })
          }
          return acc
        },
        [],
      )
    : null

  return {
    id: record.id,
    productId: record.productId,
    sitemapUrl: record.sitemapUrl,
    discoveredUrls,
    pages,
    summary,
    summaryText: record.summaryText,
    status: record.status,
    errorMessage: record.errorMessage,
    model: record.model,
    subredditQueries,
    subreddits,
    subredditStatus: record.subredditStatus ?? null,
    subredditErrorMessage: record.subredditErrorMessage,
    subredditModel: record.subredditModel,
    lastCrawledAt: record.lastCrawledAt
      ? record.lastCrawledAt.toISOString()
      : null,
    lastSubredditDiscoveryAt: record.lastSubredditDiscoveryAt
      ? record.lastSubredditDiscoveryAt.toISOString()
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function getProductIdeaProfile(
  slug: string,
): Promise<ProductIdeaProfileView> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const record = await prisma.product.findUnique({
    where: { id: product.id },
    select: {
      id: true,
      name: true,
      slug: true,
      websiteUrl: true,
      ideaProfile: { select: ideaProfileSelect },
    },
  })

  if (!record) {
    throw new Error("Product not found")
  }

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    websiteUrl: record.websiteUrl,
    ideaProfile: serializeIdeaProfile(record.ideaProfile),
  }
}

export async function refreshProductIdeaProfile(
  slug: string,
): Promise<SerializedIdeaProfile> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })
  console.info("[productIdeas:action] refresh requested", {
    productId: product.id,
    productSlug: product.slug,
  })

  const productRecord = await prisma.product.findUnique({
    where: { id: product.id },
    select: {
      id: true,
      slug: true,
      websiteUrl: true,
      name: true,
      tagline: true,
      description: true,
      pricingModel: true,
      startingPriceCents: true,
      currencyCode: true,
      type: true,
      keywords: true,
      platforms: true,
    },
  })

  if (!productRecord) {
    throw new Error("Product not found")
  }

  if (!productRecord.websiteUrl) {
    throw new Error("Product is missing a website URL")
  }

  await prisma.productIdeaProfile.upsert({
    where: { productId: productRecord.id },
    create: {
      productId: productRecord.id,
      status: ProductIdeaProfileStatus.pending,
      errorMessage: null,
      lastCrawledAt: null,
    },
    update: {
      status: ProductIdeaProfileStatus.pending,
      errorMessage: null,
    },
  })

  try {
    console.info("[productIdeas:action] starting crawl", {
      productId: productRecord.id,
      websiteUrl: productRecord.websiteUrl,
    })
    const crawl = await crawlProductWebsite(productRecord.websiteUrl)
    const synthesis = await synthesizeProductIdea(crawl, {
      name: productRecord.name,
      tagline: productRecord.tagline,
      description: productRecord.description,
      pricingModel: productRecord.pricingModel,
      startingPriceCents: productRecord.startingPriceCents,
      currencyCode: productRecord.currencyCode,
      type: productRecord.type,
      keywords: productRecord.keywords ?? undefined,
      platforms: (productRecord.platforms ?? []).map((platform) => platform),
    })
    const summaryText = buildProductIdeaSummaryText(synthesis.summary)

    const updated = await prisma.productIdeaProfile.upsert({
      where: { productId: productRecord.id },
      create: {
        productId: productRecord.id,
        sitemapUrl: crawl.sitemapUrl,
        discoveredUrls: crawl.discoveredUrls,
        pages: crawl.pages,
        summary: synthesis.summary,
        summaryText,
        status: ProductIdeaProfileStatus.ready,
        errorMessage: null,
        model: synthesis.model,
        lastCrawledAt: new Date(crawl.fetchedAt),
      },
      update: {
        sitemapUrl: crawl.sitemapUrl,
        discoveredUrls: crawl.discoveredUrls,
        pages: crawl.pages,
        summary: synthesis.summary,
        summaryText,
        status: ProductIdeaProfileStatus.ready,
        errorMessage: null,
        model: synthesis.model,
        lastCrawledAt: new Date(crawl.fetchedAt),
      },
      select: ideaProfileSelect,
    })

    console.info("[productIdeas:action] crawl + synthesis completed", {
      productId: productRecord.id,
      pages: crawl.pages.length,
      discoveredUrls: crawl.discoveredUrls.length,
    })

    return serializeIdeaProfile(updated)!
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected crawler failure"
    console.error("[productIdeas:action] refresh failed", {
      productId: productRecord.id,
      message,
      error,
    })

    await prisma.productIdeaProfile
      .update({
        where: { productId: productRecord.id },
        data: {
          status: ProductIdeaProfileStatus.failed,
          errorMessage: message,
          lastCrawledAt: new Date(),
        },
      })
      .catch(() => {
        /* ignore */
      })

    throw error
  }
}

export async function refreshProductIdeaSubreddits(
  slug: string,
  options: { forceRefresh?: boolean } = {},
): Promise<SerializedIdeaProfile> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const forceRefresh = Boolean(options.forceRefresh)

  console.info("[productIdeas:action] subreddit discovery requested", {
    productId: product.id,
    productSlug: product.slug,
    forceRefresh,
  })

  const productRecord = await prisma.product.findUnique({
    where: { id: product.id },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      description: true,
      pricingModel: true,
      startingPriceCents: true,
      currencyCode: true,
      type: true,
      keywords: true,
      platforms: true,
    },
  })

  if (!productRecord) {
    throw new Error("Product not found")
  }

  let profileRecord = await prisma.productIdeaProfile.findUnique({
    where: { productId: productRecord.id },
    select: {
      id: true,
      summary: true,
    },
  })

  if (!profileRecord) {
    profileRecord = await prisma.productIdeaProfile.create({
      data: {
        productId: productRecord.id,
      },
      select: {
        id: true,
        summary: true,
      },
    })
  }

  await prisma.productIdeaProfile.update({
    where: { productId: productRecord.id },
    data: {
      subredditStatus: ProductIdeaProfileStatus.pending,
      subredditErrorMessage: null,
    },
  })

  const productContext: ProductIdeaProductContext = {
    name: productRecord.name,
    tagline: productRecord.tagline,
    description: productRecord.description,
    pricingModel: productRecord.pricingModel,
    startingPriceCents: productRecord.startingPriceCents,
    currencyCode: productRecord.currencyCode,
    type: productRecord.type,
    keywords: productRecord.keywords ?? undefined,
    platforms: productRecord.platforms ?? undefined,
  }

  let summary: ProductIdeaSummary | undefined
  if (profileRecord?.summary && typeof profileRecord.summary === "object") {
    summary = profileRecord.summary as ProductIdeaSummary
  }

  try {
    const discovery = await discoverProductSubreddits({
      productId: productRecord.id,
      product: productContext,
      summary,
      forceRefresh,
    })

    const updated = await prisma.productIdeaProfile.update({
      where: { productId: productRecord.id },
      data: {
        subredditQueries: discovery.queries,
        subreddits: discovery.subreddits,
        subredditStatus: ProductIdeaProfileStatus.ready,
        subredditErrorMessage: null,
        subredditModel: discovery.model,
        lastSubredditDiscoveryAt: new Date(),
      },
      select: ideaProfileSelect,
    })

    console.info("[productIdeas:action] subreddit discovery completed", {
      productId: productRecord.id,
      subredditCount: discovery.subreddits.length,
      fromCache: discovery.fromCache,
    })

    return serializeIdeaProfile(updated)!
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected subreddit discovery failure"
    console.error("[productIdeas:action] subreddit discovery failed", {
      productId: productRecord.id,
      message,
      error,
    })

    await prisma.productIdeaProfile
      .update({
        where: { productId: productRecord.id },
        data: {
          subredditStatus: ProductIdeaProfileStatus.failed,
          subredditErrorMessage: message,
          lastSubredditDiscoveryAt: new Date(),
        },
      })
      .catch(() => {
        /* ignore */
      })

    throw error
  }
}
