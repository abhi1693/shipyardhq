"use server"

import {
  crawlProductWebsite,
  discoverProductDiscussions,
  discoverProductSubreddits,
  createProductIdeaComprehensiveReport,
  synthesizeProductIdea,
} from "@/lib/server/productIdeas"
import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { ProductIdeaProfileStatus, Prisma } from "@/lib/vendor/prisma/client"
import type {
  ProductIdeaProfileView,
  ProductIdeaRedditDiscussionQuery,
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
  ProductIdeaComprehensiveReport,
  ProductIdeaSubreddit,
  ProductIdeaSubredditQuery,
  ProductIdeaRedditComment,
  SerializedIdeaProfile,
} from "@/types/product-ideas"
import { buildProductIdeaSummaryText } from "@/lib/server/productIdeas/summary"
import type {
  ProductIdeaPageSnapshot,
  ProductIdeaProductContext,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"
import {
  getProductIdeaDiscussionModelLabel,
  getProductIdeaSubredditModelLabel,
} from "@/lib/server/productIdeas/config"
import { sendProductIdeaInsightsReadyEmail } from "@/lib/server/email/productIdeaInsightsReady"

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
  redditDiscussionQueries: true,
  redditDiscussions: true,
  redditInsights: true,
  redditStatus: true,
  redditErrorMessage: true,
  finalReport: true,
  finalReportStatus: true,
  finalReportErrorMessage: true,
  finalReportModel: true,
  status: true,
  errorMessage: true,
  model: true,
  lastSubredditDiscoveryAt: true,
  lastRedditDiscoveryAt: true,
  lastFinalReportAt: true,
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
    ? (record.subredditQueries as unknown[]).reduce<
        ProductIdeaSubredditQuery[]
      >((acc, value) => {
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
      }, [])
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

  const redditDiscussionQueries = Array.isArray(record.redditDiscussionQueries)
    ? (record.redditDiscussionQueries as unknown[]).reduce<
        ProductIdeaRedditDiscussionQuery[]
      >((acc, value) => {
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
            targetSubreddit:
              typeof (value as any).targetSubreddit === "string"
                ? (value as any).targetSubreddit
                : null,
          })
        }
        return acc
      }, [])
    : null

  const redditDiscussions = Array.isArray(record.redditDiscussions)
    ? (record.redditDiscussions as unknown[]).reduce<
        ProductIdeaRedditThread[]
      >((acc, value) => {
        if (
          value !== null &&
          typeof value === "object" &&
          typeof (value as any).id === "string" &&
          typeof (value as any).title === "string" &&
          typeof (value as any).permalink === "string"
        ) {
          acc.push({
            id: (value as any).id,
            title: (value as any).title,
            url:
              typeof (value as any).url === "string"
                ? (value as any).url
                : (value as any).permalink,
            permalink: (value as any).permalink,
            subreddit:
              typeof (value as any).subreddit === "string"
                ? (value as any).subreddit
                : "",
            author:
              typeof (value as any).author === "string"
                ? (value as any).author
                : null,
            score:
              typeof (value as any).score === "number"
                ? (value as any).score
                : null,
            numComments:
              typeof (value as any).numComments === "number"
                ? (value as any).numComments
                : null,
            createdAt:
              typeof (value as any).createdAt === "string"
                ? (value as any).createdAt
                : null,
            flairText:
              typeof (value as any).flairText === "string"
                ? (value as any).flairText
                : null,
            matchedQueries: Array.isArray((value as any).matchedQueries)
              ? ((value as any).matchedQueries as unknown[]).filter(
                  (entry): entry is string => typeof entry === "string",
                )
              : null,
            topComments: Array.isArray((value as any).topComments)
              ? ((value as any).topComments as unknown[]).reduce<
                  ProductIdeaRedditComment[]
                >((commentAcc, comment) => {
                  if (
                    comment !== null &&
                    typeof comment === "object" &&
                    typeof (comment as any).id === "string" &&
                    typeof (comment as any).body === "string"
                  ) {
                    commentAcc.push({
                      id: (comment as any).id,
                      body: (comment as any).body,
                      author:
                        typeof (comment as any).author === "string"
                          ? (comment as any).author
                          : null,
                      score:
                        typeof (comment as any).score === "number"
                          ? (comment as any).score
                          : null,
                      createdAt:
                        typeof (comment as any).createdAt === "string"
                          ? (comment as any).createdAt
                          : null,
                    })
                  }
                  return commentAcc
                }, [])
              : null,
          })
        }
        return acc
      }, [])
    : null

  let redditInsights: ProductIdeaRedditInsightReport | null = null
  if (record.redditInsights && typeof record.redditInsights === "object") {
    const raw = record.redditInsights as Record<string, unknown>
    if (
      "summary" in raw &&
      typeof raw.summary === "string" &&
      Array.isArray((raw as any).sections)
    ) {
      redditInsights = raw as ProductIdeaRedditInsightReport
    }
  }

  let finalReport: ProductIdeaComprehensiveReport | null = null
  if (record.finalReport && typeof record.finalReport === "object") {
    const raw = record.finalReport as Record<string, unknown>
    if (
      typeof raw.executiveSummary === "string" &&
      Array.isArray((raw as any).headlineHighlights)
    ) {
      finalReport = raw as ProductIdeaComprehensiveReport
    }
  }

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
    subredditModel: getProductIdeaSubredditModelLabel(),
    redditDiscussionQueries,
    redditDiscussions,
    redditInsights,
    redditStatus: record.redditStatus ?? null,
    redditErrorMessage: record.redditErrorMessage,
    redditModel: getProductIdeaDiscussionModelLabel(),
    finalReport,
    finalReportStatus: record.finalReportStatus ?? null,
    finalReportErrorMessage: record.finalReportErrorMessage,
    finalReportModel: record.finalReportModel,
    lastCrawledAt: record.lastCrawledAt
      ? record.lastCrawledAt.toISOString()
      : null,
    lastSubredditDiscoveryAt: record.lastSubredditDiscoveryAt
      ? record.lastSubredditDiscoveryAt.toISOString()
      : null,
    lastRedditDiscoveryAt: record.lastRedditDiscoveryAt
      ? record.lastRedditDiscoveryAt.toISOString()
      : null,
    lastFinalReportAt: record.lastFinalReportAt
      ? record.lastFinalReportAt.toISOString()
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
        lastSubredditDiscoveryAt: new Date(),
      },
      select: ideaProfileSelect,
    })

    console.info("[productIdeas:action] subreddit discovery completed", {
      productId: productRecord.id,
      subredditCount: discovery.subreddits.length,
      fromCache: discovery.fromCache,
    })

    const serialized = serializeIdeaProfile(updated)!
    serialized.subredditModel = discovery.model
    return serialized
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

export async function refreshProductIdeaDiscussions(
  slug: string,
  options: { forceRefresh?: boolean } = {},
): Promise<SerializedIdeaProfile> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const forceRefresh = Boolean(options.forceRefresh)

  console.info("[productIdeas:action] reddit discussions requested", {
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
      subreddits: true,
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
        subreddits: true,
      },
    })
  }

  await prisma.productIdeaProfile.update({
    where: { productId: productRecord.id },
    data: {
      redditStatus: ProductIdeaProfileStatus.pending,
      redditErrorMessage: null,
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

  let subreddits: ProductIdeaSubreddit[] | undefined
  if (Array.isArray(profileRecord?.subreddits)) {
    subreddits = (profileRecord.subreddits as unknown[]).reduce<
      ProductIdeaSubreddit[]
    >((acc, value) => {
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
                (entry): entry is string => typeof entry === "string",
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
    }, [])
  }

  try {
    const discovery = await discoverProductDiscussions({
      productId: productRecord.id,
      product: productContext,
      summary,
      subreddits,
      forceRefresh,
    })

    const updated = await prisma.productIdeaProfile.update({
      where: { productId: productRecord.id },
      data: {
        redditDiscussionQueries: discovery.queries,
        redditDiscussions: discovery.threads,
        redditInsights:
          discovery.insights ?? Prisma.JsonNull,
        redditStatus: ProductIdeaProfileStatus.ready,
        redditErrorMessage: null,
        lastRedditDiscoveryAt: new Date(),
      },
      select: ideaProfileSelect,
    })

    console.info("[productIdeas:action] reddit discussions completed", {
      productId: productRecord.id,
      threadCount: discovery.threads.length,
      hasInsights: Boolean(discovery.insights),
      fromCache: discovery.fromCache,
    })

    const serialized = serializeIdeaProfile(updated)!
    serialized.redditModel = discovery.model
    return serialized
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected reddit discussion discovery failure"
    console.error("[productIdeas:action] reddit discussions failed", {
      productId: productRecord.id,
      message,
      error,
    })

    await prisma.productIdeaProfile
      .update({
        where: { productId: productRecord.id },
        data: {
          redditStatus: ProductIdeaProfileStatus.failed,
          redditErrorMessage: message,
          lastRedditDiscoveryAt: new Date(),
        },
      })
      .catch(() => {
        /* ignore */
      })

    throw error
  }
}

export async function refreshProductIdeaReport(
  slug: string,
): Promise<SerializedIdeaProfile> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  console.info("[productIdeas:action] report requested", {
    productId: product.id,
    productSlug: product.slug,
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

  const existingProfile = await prisma.productIdeaProfile.findUnique({
    where: { productId: productRecord.id },
    select: { id: true },
  })

  if (!existingProfile) {
    await prisma.productIdeaProfile.create({
      data: {
        productId: productRecord.id,
      },
    })
  }

  await prisma.productIdeaProfile.update({
    where: { productId: productRecord.id },
    data: {
      finalReportStatus: ProductIdeaProfileStatus.pending,
      finalReportErrorMessage: null,
    },
  })

  const profileSnapshot = await prisma.productIdeaProfile.findUnique({
    where: { productId: productRecord.id },
    select: ideaProfileSelect,
  })

  if (!profileSnapshot) {
    throw new Error("Product idea profile missing")
  }

  const serializedProfile = serializeIdeaProfile(profileSnapshot)
  if (!serializedProfile) {
    throw new Error("Failed to load product idea profile")
  }

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

  try {
    const result = await createProductIdeaComprehensiveReport({
      productId: productRecord.id,
      product: productContext,
      summary: serializedProfile.summary ?? undefined,
      summaryText: serializedProfile.summaryText ?? undefined,
      subreddits: serializedProfile.subreddits ?? undefined,
      insights: serializedProfile.redditInsights ?? undefined,
      threads: serializedProfile.redditDiscussions ?? undefined,
    })

    const updated = await prisma.productIdeaProfile.update({
      where: { productId: productRecord.id },
      data: {
        finalReport: result.report,
        finalReportStatus: ProductIdeaProfileStatus.ready,
        finalReportErrorMessage: null,
        finalReportModel: result.model,
        lastFinalReportAt: new Date(),
      },
      select: ideaProfileSelect,
    })

    console.info("[productIdeas:action] report completed", {
      productId: productRecord.id,
      highlightCount: result.report.headlineHighlights.length,
    })

    return serializeIdeaProfile(updated)!
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected comprehensive report failure"
    console.error("[productIdeas:action] report failed", {
      productId: productRecord.id,
      message,
      error,
    })

    await prisma.productIdeaProfile
      .update({
        where: { productId: productRecord.id },
        data: {
          finalReportStatus: ProductIdeaProfileStatus.failed,
          finalReportErrorMessage: message,
          lastFinalReportAt: new Date(),
        },
      })
      .catch(() => {
        /* ignore */
      })

    throw error
  }
}

export async function runProductIdeaInsightsPipeline(
  slug: string,
): Promise<SerializedIdeaProfile> {
  const { product, currentUser } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  if (!currentUser.email) {
    throw new Error("Cannot run pipeline without an email on file")
  }

  console.info("[productIdeas:action] full pipeline requested", {
    productId: product.id,
    productSlug: product.slug,
  })

  let latestProfile: SerializedIdeaProfile | null = null

  try {
    latestProfile = await refreshProductIdeaProfile(slug)
    latestProfile = await refreshProductIdeaSubreddits(slug, { forceRefresh: true })
    latestProfile = await refreshProductIdeaDiscussions(slug, { forceRefresh: true })
    latestProfile = await refreshProductIdeaReport(slug)

    if (!latestProfile) {
      throw new Error("Pipeline completed without returning a profile")
    }

    await sendProductIdeaInsightsReadyEmail({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      recipientEmail: currentUser.email,
      profile: latestProfile,
    })

    console.info("[productIdeas:action] full pipeline completed", {
      productId: product.id,
      productSlug: product.slug,
    })

    return latestProfile
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Insights pipeline failed"
    console.error("[productIdeas:action] full pipeline failed", {
      productId: product.id,
      productSlug: product.slug,
      message,
      error,
    })
    throw error
  }
}
