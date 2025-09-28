import prisma from "@/lib/prisma"
import {
  crawlProductWebsite,
  discoverProductDiscussions,
  discoverProductSubreddits,
  createProductIdeaComprehensiveReport,
  synthesizeProductIdea,
} from "@/lib/server/productIdeas"
import { buildProductIdeaSummaryText } from "@/lib/server/productIdeas/summary"
import type {
  ProductIdeaProductContext,
  ProductIdeaSummary,
} from "@/lib/server/productIdeas/types"
import {
  ideaProfileSelect,
  serializeIdeaProfile,
} from "@/lib/server/productIdeas/profile"
import { ProductIdeaProfileStatus, Prisma } from "@/lib/vendor/prisma/client"
import { sendProductIdeaInsightsReadyEmail } from "@/lib/server/email/productIdeaInsightsReady"
import type {
  ProductIdeaRedditInsightReport,
  ProductIdeaRedditThread,
  ProductIdeaSubreddit,
  SerializedIdeaProfile,
} from "@/types/product-ideas"

type ProductRecord = NonNullable<
  Awaited<ReturnType<typeof loadProductWithOwner>>
>

export type PipelineRunPlan = {
  runCrawl: boolean
  runSubreddits: boolean
  runReddit: boolean
  runReport: boolean
}

export function determinePipelineRunPlan(
  profile: SerializedIdeaProfile | null,
): PipelineRunPlan {
  const defaultPlan: PipelineRunPlan = {
    runCrawl: true,
    runSubreddits: true,
    runReddit: true,
    runReport: true,
  }

  if (!profile) {
    return defaultPlan
  }

  const stageStatuses = [
    profile.status,
    profile.subredditStatus,
    profile.redditStatus,
    profile.finalReportStatus,
  ]

  const firstFailedIndex = stageStatuses.findIndex(
    (status) => status === ProductIdeaProfileStatus.failed,
  )

  if (firstFailedIndex === -1) {
    return defaultPlan
  }

  const plan: PipelineRunPlan = {
    runCrawl: firstFailedIndex <= 0,
    runSubreddits: firstFailedIndex <= 1,
    runReddit: firstFailedIndex <= 2,
    runReport: true,
  }

  if (!profile.summary) {
    plan.runCrawl = true
  }

  if (!plan.runSubreddits) {
    const hasSubreddits = Array.isArray(profile.subreddits) && profile.subreddits.length > 0
    if (!hasSubreddits) {
      plan.runSubreddits = true
    }
  }

  if (!plan.runReddit) {
    const hasRedditData =
      (Array.isArray(profile.redditDiscussions) && profile.redditDiscussions.length > 0) ||
      Boolean(profile.redditInsights)
    if (!hasRedditData) {
      plan.runReddit = true
    }
  }

  return plan
}

async function loadProductWithOwner(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      name: true,
      websiteUrl: true,
      tagline: true,
      description: true,
      pricingModel: true,
      startingPriceCents: true,
      currencyCode: true,
      type: true,
      keywords: true,
      platforms: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })
}

function buildProductContext(record: ProductRecord): ProductIdeaProductContext {
  return {
    name: record.name,
    tagline: record.tagline,
    description: record.description,
    pricingModel: record.pricingModel,
    startingPriceCents: record.startingPriceCents,
    currencyCode: record.currencyCode,
    type: record.type,
    keywords: record.keywords ?? undefined,
    platforms: record.platforms ?? undefined,
  }
}

async function ensureProfilePending(
  productId: string,
  plan: PipelineRunPlan,
) {
  await prisma.productIdeaProfile.upsert({
    where: { productId },
    create: {
      productId,
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
      ...(plan.runCrawl
        ? {
            status: ProductIdeaProfileStatus.pending,
            errorMessage: null,
          }
        : {}),
      ...(plan.runSubreddits
        ? {
            subredditStatus: ProductIdeaProfileStatus.pending,
            subredditErrorMessage: null,
          }
        : {}),
      ...(plan.runReddit
        ? {
            redditStatus: ProductIdeaProfileStatus.pending,
            redditErrorMessage: null,
          }
        : {}),
      ...(plan.runReport
        ? {
            finalReportStatus: ProductIdeaProfileStatus.pending,
            finalReportErrorMessage: null,
          }
        : {}),
    },
  })
}

type PipelineResult = {
  profile: SerializedIdeaProfile
  summary?: ProductIdeaSummary | null
  summaryText?: string | null
}

export async function runProductIdeaPipeline(job: {
  productId: string
  requestedByUserId?: string | null
}): Promise<PipelineResult> {
  const productRecord = await loadProductWithOwner(job.productId)

  if (!productRecord) {
    throw new Error("Product not found")
  }

  if (!productRecord.websiteUrl) {
    throw new Error("Product is missing a website URL")
  }

  if (!productRecord.user?.email) {
    throw new Error("Product owner does not have a contact email")
  }

  const existingSnapshot = await prisma.productIdeaProfile.findUnique({
    where: { productId: productRecord.id },
    select: ideaProfileSelect,
  })

  const existingProfile = serializeIdeaProfile(existingSnapshot)
  let plan = determinePipelineRunPlan(existingProfile)
  if (!plan.runReport) {
    plan = { ...plan, runReport: true }
  }

  await ensureProfilePending(productRecord.id, plan)

  const productContext = buildProductContext(productRecord)
  let summary: ProductIdeaSummary | null = existingProfile?.summary ?? null
  let summaryText: string | null = existingProfile?.summaryText ?? null
  let subreddits: ProductIdeaSubreddit[] = existingProfile?.subreddits
    ? [...existingProfile.subreddits]
    : []
  let subredditModelLabel: string | null = existingProfile?.subredditModel ?? null
  let redditThreads: ProductIdeaRedditThread[] = existingProfile?.redditDiscussions
    ? [...existingProfile.redditDiscussions]
    : []
  let redditInsights: ProductIdeaRedditInsightReport | null =
    existingProfile?.redditInsights ?? null
  let redditModelLabel: string | null = existingProfile?.redditModel ?? null

  // Step 1: Crawl + summarize
  if (plan.runCrawl) {
    try {
      console.info("[productIdeas:pipeline] crawl starting", {
        productId: productRecord.id,
        websiteUrl: productRecord.websiteUrl,
      })

      const crawl = await crawlProductWebsite(productRecord.websiteUrl)
      const synthesis = await synthesizeProductIdea(crawl, productContext)
      summary = synthesis.summary ?? null
      summaryText = buildProductIdeaSummaryText(synthesis.summary)

      await prisma.productIdeaProfile.update({
        where: { productId: productRecord.id },
        data: {
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
      })

      console.info("[productIdeas:pipeline] crawl completed", {
        productId: productRecord.id,
        pageCount: crawl.pages.length,
        discoveredUrls: crawl.discoveredUrls.length,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected crawler failure"
      console.error("[productIdeas:pipeline] crawl failed", {
        productId: productRecord.id,
        message,
        error,
      })

      await prisma.productIdeaProfile.update({
        where: { productId: productRecord.id },
        data: {
          status: ProductIdeaProfileStatus.failed,
          errorMessage: message,
          lastCrawledAt: new Date(),
        },
      })

      throw error
    }
  } else {
    console.info("[productIdeas:pipeline] crawl skipped; using existing summary", {
      productId: productRecord.id,
    })
  }

  // Step 2: Subreddit discovery
  if (plan.runSubreddits) {
    try {
      console.info("[productIdeas:pipeline] subreddit discovery starting", {
        productId: productRecord.id,
      })

      const discovery = await discoverProductSubreddits({
        productId: productRecord.id,
        product: productContext,
        summary: summary ?? undefined,
        forceRefresh: true,
      })

      subreddits = discovery.subreddits

      await prisma.productIdeaProfile.update({
        where: { productId: productRecord.id },
        data: {
          subredditQueries: discovery.queries,
          subreddits: discovery.subreddits,
          subredditStatus: ProductIdeaProfileStatus.ready,
          subredditErrorMessage: null,
          lastSubredditDiscoveryAt: new Date(),
        },
      })

      subredditModelLabel = discovery.model

      console.info("[productIdeas:pipeline] subreddit discovery completed", {
        productId: productRecord.id,
        communityCount: discovery.subreddits.length,
        queryCount: discovery.queries.length,
        fromCache: discovery.fromCache,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected subreddit discovery failure"
      console.error("[productIdeas:pipeline] subreddit discovery failed", {
        productId: productRecord.id,
        message,
        error,
      })

      await prisma.productIdeaProfile.update({
        where: { productId: productRecord.id },
        data: {
          subredditStatus: ProductIdeaProfileStatus.failed,
          subredditErrorMessage: message,
          lastSubredditDiscoveryAt: new Date(),
        },
      })

      throw error
    }
  } else {
    console.info("[productIdeas:pipeline] subreddit discovery skipped; using existing data", {
      productId: productRecord.id,
    })
  }

  // Step 3: Reddit discussions
  if (plan.runReddit) {
    try {
      console.info("[productIdeas:pipeline] reddit discussions starting", {
        productId: productRecord.id,
      })

      const discovery = await discoverProductDiscussions({
        productId: productRecord.id,
        product: productContext,
        summary: summary ?? undefined,
        subreddits,
        forceRefresh: true,
      })

      redditThreads = discovery.threads
      redditInsights = discovery.insights ?? null

      await prisma.productIdeaProfile.update({
        where: { productId: productRecord.id },
        data: {
          redditDiscussionQueries: discovery.queries,
          redditDiscussions: discovery.threads,
          redditInsights: discovery.insights ?? Prisma.JsonNull,
          redditStatus: ProductIdeaProfileStatus.ready,
          redditErrorMessage: null,
          lastRedditDiscoveryAt: new Date(),
        },
      })

      console.info("[productIdeas:pipeline] reddit discussions completed", {
        productId: productRecord.id,
        threadCount: discovery.threads.length,
        hasInsights: Boolean(discovery.insights),
        fromCache: discovery.fromCache,
      })

      redditModelLabel = discovery.model
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected reddit discussion discovery failure"
      console.error("[productIdeas:pipeline] reddit discussions failed", {
        productId: productRecord.id,
        message,
        error,
      })

      await prisma.productIdeaProfile.update({
        where: { productId: productRecord.id },
        data: {
          redditStatus: ProductIdeaProfileStatus.failed,
          redditErrorMessage: message,
          lastRedditDiscoveryAt: new Date(),
        },
      })

      throw error
    }
  } else {
    console.info("[productIdeas:pipeline] reddit discovery skipped; using existing data", {
      productId: productRecord.id,
    })
  }

  // Step 4: Comprehensive report
  let finalProfile: SerializedIdeaProfile | null = null
  try {
    console.info("[productIdeas:pipeline] report synthesis starting", {
      productId: productRecord.id,
    })

    const result = await createProductIdeaComprehensiveReport({
      productId: productRecord.id,
      product: productContext,
      summary: summary ?? undefined,
      summaryText: summaryText ?? undefined,
      subreddits,
      insights: redditInsights ?? undefined,
      threads: redditThreads ?? undefined,
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

    finalProfile = serializeIdeaProfile(updated)
    console.info("[productIdeas:pipeline] report synthesis completed", {
      productId: productRecord.id,
      highlightCount: result.report.headlineHighlights.length,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected comprehensive report failure"
    console.error("[productIdeas:pipeline] report synthesis failed", {
      productId: productRecord.id,
      message,
      error,
    })

    await prisma.productIdeaProfile.update({
      where: { productId: productRecord.id },
      data: {
        finalReportStatus: ProductIdeaProfileStatus.failed,
        finalReportErrorMessage: message,
        lastFinalReportAt: new Date(),
      },
    })

    throw error
  }

  if (!finalProfile) {
    const snapshot = await prisma.productIdeaProfile.findUnique({
      where: { productId: productRecord.id },
      select: ideaProfileSelect,
    })
    finalProfile = serializeIdeaProfile(snapshot)
  }

  if (!finalProfile) {
    throw new Error("Failed to load updated product idea profile")
  }

  // Ensure model labels show the actual run models where available
  if (subredditModelLabel) {
    finalProfile.subredditModel = subredditModelLabel
  }
  if (redditModelLabel) {
    finalProfile.redditModel = redditModelLabel
  }

  await sendProductIdeaInsightsReadyEmail({
    productId: productRecord.id,
    productSlug: productRecord.slug,
    productName: productRecord.name,
    recipientEmail: productRecord.user!.email!,
    profile: finalProfile,
  })

  console.info("[productIdeas:pipeline] insights email dispatched", {
    productId: productRecord.id,
    recipient: productRecord.user!.email,
  })

  return {
    profile: finalProfile,
    summary,
    summaryText,
  }
}
