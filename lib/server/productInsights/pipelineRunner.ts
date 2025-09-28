import prisma from "@/lib/prisma"
import {
  crawlProductWebsite,
  discoverProductDiscussions,
  discoverProductSubreddits,
  createProductInsightComprehensiveReport,
  synthesizeProductInsight,
} from "@/lib/server/productInsights"
import { buildProductInsightSummaryText } from "@/lib/server/productInsights/summary"
import type {
  ProductInsightCommunityStageData,
  ProductInsightDiscussionStageData,
  ProductInsightProfilePayload,
  ProductInsightReportStageData,
  ProductInsightSnapshotStageData,
  ProductInsightStageDataById,
  ProductInsightStageDefinition,
  ProductInsightStageId,
} from "@/types/product-insights"
import {
  insightProfileSelect,
  serializeInsightProfile,
} from "@/lib/server/productInsights/profile"
import {
  PRODUCT_INSIGHT_STAGE_DEFINITIONS,
  PRODUCT_INSIGHT_STAGE_MAP,
} from "@/lib/server/productInsights/stages"
import { sendProductInsightInsightsReadyEmail } from "@/lib/server/email/productInsightsReady"
import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"
import {
  ProductInsightStatus,
  Prisma,
} from "@/lib/vendor/prisma/client"

export type PipelineRunPlan = Record<ProductInsightStageId, boolean>

type ProductRecord = NonNullable<
  Awaited<ReturnType<typeof loadProductWithOwner>>
>

type StageDataBundle = {
  snapshot: ProductInsightSnapshotStageData | null
  summary: ProductInsightSummary | null
  summaryText: string | null
  communities: ProductInsightCommunityStageData | null
  discussions: ProductInsightDiscussionStageData | null
  report: ProductInsightReportStageData | null
}

function extractStageData<K extends ProductInsightStageId>(
  profile: ProductInsightProfilePayload | null,
  stageId: K,
): ProductInsightStageDataById[K] | null {
  const stage = profile?.stages?.[stageId]
  if (!stage || stage.stageId !== stageId) {
    return null
  }
  return stage.data as ProductInsightStageDataById[K] | null
}

export function determinePipelineRunPlan(
  profile: ProductInsightProfilePayload | null,
): PipelineRunPlan {
  const plan: PipelineRunPlan = {
    "product.snapshot": true,
    "reddit.communities": true,
    "reddit.discussions": true,
    "report.comprehensive": true,
  }

  const stages = PRODUCT_INSIGHT_STAGE_DEFINITIONS.slice().sort(
    (a, b) => a.order - b.order,
  )

  for (const stage of stages) {
    const view = profile?.stages[stage.id]
    const dependenciesScheduled = stage.dependencies.some((dependency) =>
      plan[dependency] === true,
    )
    const hasReadyData = Boolean(
      view &&
        view.status === "ready" &&
        view.data &&
        (!Array.isArray(view.data) || view.data.length > 0),
    )

    plan[stage.id] = dependenciesScheduled || !hasReadyData
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

function buildProductContext(record: ProductRecord): ProductInsightProductContext {
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

async function ensureProfilePending(productId: string) {
  return prisma.productInsightProfile.upsert({
    where: { productId },
    create: {
      productId,
      status: ProductInsightStatus.pending,
      errorMessage: null,
    },
    update: {
      status: ProductInsightStatus.pending,
      errorMessage: null,
    },
    select: {
      id: true,
      productId: true,
    },
  })
}

function stageWhere(
  profileId: string,
  stage: ProductInsightStageDefinition,
) {
  return {
    profileId_stageId_providerType: {
      profileId,
      stageId: stage.id,
      providerType: stage.providerType,
    },
  }
}

async function markStagePending(
  profileId: string,
  stage: ProductInsightStageDefinition,
) {
  await prisma.productInsightStageResult.upsert({
    where: stageWhere(profileId, stage),
    create: {
      profileId,
      stageId: stage.id,
      providerType: stage.providerType,
      status: ProductInsightStatus.pending,
      data: Prisma.JsonNull,
      metrics: Prisma.JsonNull,
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
    },
    update: {
      status: ProductInsightStatus.pending,
      data: Prisma.JsonNull,
      metrics: Prisma.JsonNull,
      errorMessage: null,
      startedAt: new Date(),
      completedAt: null,
    },
  })
}

async function markStageReady(
  profileId: string,
  stage: ProductInsightStageDefinition,
  data: unknown,
  metrics: Record<string, unknown> | null,
) {
  await prisma.productInsightStageResult.update({
    where: stageWhere(profileId, stage),
    data: {
      status: ProductInsightStatus.ready,
      data: data ?? Prisma.JsonNull,
      metrics: metrics ?? Prisma.JsonNull,
      errorMessage: null,
      completedAt: new Date(),
    },
  })
}

async function markStageFailed(
  profileId: string,
  stage: ProductInsightStageDefinition,
  message: string,
  metrics?: Record<string, unknown> | null,
) {
  await prisma.productInsightStageResult.update({
    where: stageWhere(profileId, stage),
    data: {
      status: ProductInsightStatus.failed,
      errorMessage: message,
      metrics: metrics ?? Prisma.JsonNull,
      completedAt: new Date(),
    },
  })
}

async function updateProfileStatus(
  productId: string,
  status: ProductInsightStatus,
  options: { errorMessage?: string | null; lastRunAt?: Date | null } = {},
) {
  const data: Prisma.ProductInsightProfileUpdateInput = {
    status,
    errorMessage: options.errorMessage ?? null,
  }
  if (options.lastRunAt) {
    data.lastRunAt = options.lastRunAt
  }
  await prisma.productInsightProfile.update({
    where: { productId },
    data,
  })
}

type PipelineResult = {
  profile: ProductInsightProfilePayload
  summary?: ProductInsightSummary | null
  summaryText?: string | null
}

export async function runProductInsightPipeline(job: {
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

  const existingSnapshot = await prisma.productInsightProfile.findUnique({
    where: { productId: productRecord.id },
    select: insightProfileSelect,
  })

  const existingProfile = serializeInsightProfile(existingSnapshot)
  const plan = determinePipelineRunPlan(existingProfile)

  const profileRef = await ensureProfilePending(productRecord.id)
  const productContext = buildProductContext(productRecord)

  const existingSnapshotData = extractStageData(existingProfile, "product.snapshot")
  const existingCommunityData = extractStageData(
    existingProfile,
    "reddit.communities",
  )
  const existingDiscussionData = extractStageData(
    existingProfile,
    "reddit.discussions",
  )
  const existingReportData = extractStageData(
    existingProfile,
    "report.comprehensive",
  )

  const stages: StageDataBundle = {
    snapshot: existingSnapshotData,
    summary:
      existingSnapshotData?.summary ?? existingProfile?.summary ?? null,
    summaryText:
      existingSnapshotData?.summaryText ?? existingProfile?.summaryText ?? null,
    communities: existingCommunityData,
    discussions: existingDiscussionData,
    report: existingReportData,
  }

  const snapshotStage = PRODUCT_INSIGHT_STAGE_MAP["product.snapshot"]
  if (plan["product.snapshot"]) {
    await markStagePending(profileRef.id, snapshotStage)
    try {
      console.info("[productInsights:pipeline] snapshot starting", {
        productId: productRecord.id,
        websiteUrl: productRecord.websiteUrl,
      })

      const crawl = await crawlProductWebsite(productRecord.websiteUrl)
      const synthesis = await synthesizeProductInsight(crawl, productContext)
      const summaryText = buildProductInsightSummaryText(synthesis.summary)

      stages.snapshot = {
        sitemapUrl: crawl.sitemapUrl ?? undefined,
        discoveredUrls: crawl.discoveredUrls ?? [],
        pages: crawl.pages,
        summary: synthesis.summary ?? null,
        summaryText,
        model: synthesis.model,
        fetchedAt: crawl.fetchedAt,
      }
      stages.summary = synthesis.summary ?? null
      stages.summaryText = summaryText

      await markStageReady(profileRef.id, snapshotStage, stages.snapshot, {
        pageCount: crawl.pages.length,
        discoveredUrlCount: crawl.discoveredUrls.length,
      })

      console.info("[productInsights:pipeline] snapshot completed", {
        productId: productRecord.id,
        pageCount: crawl.pages.length,
        discoveredUrls: crawl.discoveredUrls.length,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Snapshot stage failed"
      await markStageFailed(profileRef.id, snapshotStage, message)
      await updateProfileStatus(productRecord.id, ProductInsightStatus.failed, {
        errorMessage: message,
      })
      console.error("[productInsights:pipeline] snapshot failed", {
        productId: productRecord.id,
        message,
        error,
      })
      throw error
    }
  }

  const communityStage = PRODUCT_INSIGHT_STAGE_MAP["reddit.communities"]
  if (plan["reddit.communities"]) {
    await markStagePending(profileRef.id, communityStage)
    try {
      console.info("[productInsights:pipeline] community discovery starting", {
        productId: productRecord.id,
      })

      const discovery = await discoverProductSubreddits({
        productId: productRecord.id,
        product: productContext,
        summary: stages.summary ?? undefined,
        forceRefresh: true,
      })

      stages.communities = {
        queries: discovery.queries,
        subreddits: discovery.subreddits,
        model: discovery.model,
        discoveredAt: new Date().toISOString(),
      }

      await markStageReady(profileRef.id, communityStage, stages.communities, {
        queryCount: discovery.queries.length,
        communityCount: discovery.subreddits.length,
        fromCache: discovery.fromCache ?? false,
      })

      console.info("[productInsights:pipeline] community discovery completed", {
        productId: productRecord.id,
        communityCount: discovery.subreddits.length,
        queryCount: discovery.queries.length,
        fromCache: discovery.fromCache,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Community discovery stage failed"
      await markStageFailed(profileRef.id, communityStage, message)
      await updateProfileStatus(productRecord.id, ProductInsightStatus.failed, {
        errorMessage: message,
      })
      console.error("[productInsights:pipeline] community discovery failed", {
        productId: productRecord.id,
        message,
        error,
      })
      throw error
    }
  }

  const discussionStage = PRODUCT_INSIGHT_STAGE_MAP["reddit.discussions"]
  if (plan["reddit.discussions"]) {
    await markStagePending(profileRef.id, discussionStage)
    try {
      console.info("[productInsights:pipeline] discussion discovery starting", {
        productId: productRecord.id,
      })

      const discovery = await discoverProductDiscussions({
        productId: productRecord.id,
        product: productContext,
        summary: stages.summary ?? undefined,
        subreddits: stages.communities?.subreddits ?? undefined,
        forceRefresh: true,
      })

      stages.discussions = {
        queries: discovery.queries,
        threads: discovery.threads,
        insights: discovery.insights ?? null,
        model: discovery.model,
        discoveredAt: new Date().toISOString(),
      }

      await markStageReady(profileRef.id, discussionStage, stages.discussions, {
        queryCount: discovery.queries.length,
        threadCount: discovery.threads.length,
        hasInsights: Boolean(discovery.insights),
        fromCache: discovery.fromCache ?? false,
      })

      console.info("[productInsights:pipeline] discussion discovery completed", {
        productId: productRecord.id,
        threadCount: discovery.threads.length,
        hasInsights: Boolean(discovery.insights),
        fromCache: discovery.fromCache,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Discussion discovery stage failed"
      await markStageFailed(profileRef.id, discussionStage, message)
      await updateProfileStatus(productRecord.id, ProductInsightStatus.failed, {
        errorMessage: message,
      })
      console.error("[productInsights:pipeline] discussion discovery failed", {
        productId: productRecord.id,
        message,
        error,
      })
      throw error
    }
  }

  const reportStage = PRODUCT_INSIGHT_STAGE_MAP["report.comprehensive"]
  if (plan["report.comprehensive"]) {
    await markStagePending(profileRef.id, reportStage)

    try {
      console.info("[productInsights:pipeline] report synthesis starting", {
        productId: productRecord.id,
      })

      const result = await createProductInsightComprehensiveReport({
        productId: productRecord.id,
        product: productContext,
        summary: stages.summary ?? undefined,
        summaryText: stages.summaryText ?? undefined,
        subreddits: stages.communities?.subreddits ?? undefined,
        insights: stages.discussions?.insights ?? undefined,
        threads: stages.discussions?.threads ?? undefined,
      })

      stages.report = {
        report: result.report,
        model: result.model,
        generatedAt: new Date().toISOString(),
      }

      await markStageReady(profileRef.id, reportStage, stages.report, {
        highlightCount: result.report.headlineHighlights.length,
        actionCount: result.report.recommendedActions.length,
      })

      console.info("[productInsights:pipeline] report synthesis completed", {
        productId: productRecord.id,
        highlightCount: result.report.headlineHighlights.length,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Comprehensive report stage failed"
      await markStageFailed(profileRef.id, reportStage, message)
      await updateProfileStatus(productRecord.id, ProductInsightStatus.failed, {
        errorMessage: message,
      })
      console.error("[productInsights:pipeline] report synthesis failed", {
        productId: productRecord.id,
        message,
        error,
      })
      throw error
    }
  }

  await updateProfileStatus(productRecord.id, ProductInsightStatus.ready, {
    errorMessage: null,
    lastRunAt: new Date(),
  })

  const refreshed = await prisma.productInsightProfile.findUnique({
    where: { productId: productRecord.id },
    select: insightProfileSelect,
  })

  const finalProfile = serializeInsightProfile(refreshed)
  if (!finalProfile) {
    throw new Error("Failed to load updated product insight profile")
  }

  await sendProductInsightInsightsReadyEmail({
    productId: productRecord.id,
    productSlug: productRecord.slug,
    productName: productRecord.name,
    recipientEmail: productRecord.user!.email!,
    profile: finalProfile,
  })

  console.info("[productInsights:pipeline] insights email dispatched", {
    productId: productRecord.id,
    recipient: productRecord.user!.email,
  })

  return {
    profile: finalProfile,
    summary: stages.summary,
    summaryText: stages.summaryText,
  }
}
