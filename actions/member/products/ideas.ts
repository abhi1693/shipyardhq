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
  ProductIdeaSubreddit,
  SerializedIdeaProfile,
} from "@/types/product-ideas"
import { buildProductIdeaSummaryText } from "@/lib/server/productIdeas/summary"
import type {
  ProductIdeaProductContext,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"
import {
  ideaProfileSelect,
  serializeIdeaProfile,
} from "@/lib/server/productIdeas/profile"
import { enqueueProductIdeaPipelineJob } from "@/lib/server/productIdeas/pipelineQueue"
import { runProductIdeaPipeline } from "@/lib/server/productIdeas/pipelineRunner"
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

export async function scheduleProductIdeaInsightsPipeline(
  slug: string,
): Promise<{
  profile: SerializedIdeaProfile
  queued: boolean
  duplicate?: boolean
  executedInline?: boolean
}> {
  const { product, currentUser } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const productRecord = await prisma.product.findUnique({
    where: { id: product.id },
    select: {
      id: true,
      slug: true,
      websiteUrl: true,
      name: true,
      user: { select: { email: true } },
    },
  })

  if (!productRecord) {
    throw new Error("Product not found")
  }

  if (!productRecord.websiteUrl) {
    throw new Error("Product is missing a website URL")
  }

  if (!productRecord.user?.email) {
    throw new Error("Cannot queue pipeline without a contact email")
  }

  await prisma.productIdeaProfile.upsert({
    where: { productId: productRecord.id },
    create: {
      productId: productRecord.id,
      status: ProductIdeaProfileStatus.pending,
      errorMessage: null,
      subredditStatus: ProductIdeaProfileStatus.pending,
      subredditErrorMessage: null,
      redditStatus: ProductIdeaProfileStatus.pending,
      redditErrorMessage: null,
      finalReportStatus: ProductIdeaProfileStatus.pending,
      finalReportErrorMessage: null,
    },
    update: {
      status: ProductIdeaProfileStatus.pending,
      errorMessage: null,
      subredditStatus: ProductIdeaProfileStatus.pending,
      subredditErrorMessage: null,
      redditStatus: ProductIdeaProfileStatus.pending,
      redditErrorMessage: null,
      finalReportStatus: ProductIdeaProfileStatus.pending,
      finalReportErrorMessage: null,
    },
  })

  const queueResult = await enqueueProductIdeaPipelineJob({
    productId: productRecord.id,
    requestedByUserId: currentUser.id,
  })

  if (!queueResult.queued && queueResult.reason !== "duplicate") {
    console.warn("[productIdeas:action] queue unavailable, running inline", {
      productId: productRecord.id,
      reason: queueResult.reason,
    })

    const { profile } = await runProductIdeaPipeline({
      productId: productRecord.id,
      requestedByUserId: currentUser.id,
    })

    return {
      profile,
      queued: false,
      executedInline: true,
    }
  }

  const snapshot = await prisma.productIdeaProfile.findUnique({
    where: { productId: productRecord.id },
    select: ideaProfileSelect,
  })

  const serialized = serializeIdeaProfile(snapshot)
  if (!serialized) {
    throw new Error("Failed to load product idea profile")
  }

  return {
    profile: serialized,
    queued: queueResult.queued,
    duplicate: queueResult.reason === "duplicate",
  }
}
