import prisma from "@/lib/prisma"
import { PIPELINE_STAGE_REGISTRY } from "@/lib/server/productInsights/pipeline/stages"
import type {
  PipelineStage,
  PipelineStageContext,
  PipelineStageSharedState,
} from "@/lib/server/productInsights/pipeline/types"
import {
  insightProfileSelect,
  serializeInsightProfile,
} from "@/lib/server/productInsights/profile"
import {
  PRODUCT_INSIGHT_STAGE_DEFINITIONS,
  PRODUCT_INSIGHT_STAGE_MAP,
  PRODUCT_INSIGHT_STAGE_SET_MAP,
} from "@/lib/server/productInsights/stages"
import { sendProductInsightInsightsReadyEmail } from "@/lib/server/email/productInsightsReady"
import type {
  ProductInsightProductContext,
  ProductInsightSummary,
} from "@/lib/server/productInsights/types"
import type {
  ProductInsightProfilePayload,
  ProductInsightStageDataById,
  ProductInsightStageId,
  ProductInsightStageSetId,
  ProductInsightStageView,
  ProductInsightStageViewMap,
  ProductInsightHarvestMode,
} from "@/types/product-insights"
import { ProductInsightStatus, Prisma } from "@/lib/vendor/prisma/client"

export type PipelineRunPlan = {
  shouldRun: Record<ProductInsightStageId, boolean>
  forcedStageIds: Set<ProductInsightStageId>
  allowedStageIds: Set<ProductInsightStageId>
  orderedStageIds: ProductInsightStageId[]
}

type ProductRecord = NonNullable<
  Awaited<ReturnType<typeof loadProductWithOwner>>
>

function hasUsableStageData(data: unknown): boolean {
  if (data == null) return false
  if (Array.isArray(data)) return data.length > 0
  if (typeof data === "object") {
    return Object.keys(data as Record<string, unknown>).length > 0
  }
  return true
}

function parseTimestamp(value?: string | null): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
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

function buildInitialSharedState(
  profile: ProductInsightProfilePayload | null,
): PipelineStageSharedState {
  const shared: PipelineStageSharedState = {}

  const snapshot = extractStageData(profile, "product.snapshot")
  if (snapshot) {
    shared.snapshot = snapshot
    shared.summary = snapshot.summary ?? null
    shared.summaryText = snapshot.summaryText ?? null
  }

  const competitors = extractStageData(profile, "product.competitors")
  if (competitors) {
    shared.competitors = competitors
  }

  const communities = extractStageData(profile, "reddit.communities")
  if (communities) {
    shared.communities = communities
  }

  const discussions = extractStageData(profile, "reddit.discussions")
  if (discussions) {
    shared.discussions = discussions
  }

  const productHunt = extractStageData(profile, "producthunt.launches")
  if (productHunt) {
    shared.productHunt = productHunt
  }

  const hackerNews = extractStageData(profile, "hackernews.discussions")
  if (hackerNews) {
    shared.hackerNews = hackerNews
  }

  const report = extractStageData(profile, "report.comprehensive")
  if (report) {
    shared.report = report
  }

  return shared
}

function mergeSharedState(
  shared: PipelineStageSharedState,
  updates?: Partial<PipelineStageSharedState>,
) {
  if (!updates) return
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "undefined") continue
    ;(shared as Record<string, unknown>)[key] = value
  }
}

function resolveStageSet(stageSetId?: ProductInsightStageSetId): {
  stageSetId: ProductInsightStageSetId
  forcedStageIds: Set<ProductInsightStageId>
  allowedStageIds: Set<ProductInsightStageId>
} {
  const fallback = PRODUCT_INSIGHT_STAGE_SET_MAP["default"]
  const stageSet = stageSetId
    ? (PRODUCT_INSIGHT_STAGE_SET_MAP[stageSetId] ?? fallback)
    : fallback
  const forcedStageIds = new Set<ProductInsightStageId>(stageSet.stages)
  const allowedStageIds = new Set<ProductInsightStageId>(forcedStageIds)

  const queue: ProductInsightStageId[] = Array.from(allowedStageIds)
  while (queue.length) {
    const current = queue.pop()
    if (!current) continue
    const definition = PRODUCT_INSIGHT_STAGE_MAP[current]
    if (!definition) continue
    for (const dependency of definition.dependencies) {
      if (!allowedStageIds.has(dependency)) {
        allowedStageIds.add(dependency)
        queue.push(dependency)
      }
    }
  }

  return {
    stageSetId: stageSet.id,
    forcedStageIds,
    allowedStageIds,
  }
}

function isStageReady(
  profile: ProductInsightProfilePayload | null,
  stageId: ProductInsightStageId,
): boolean {
  const view = profile?.stages?.[stageId]
  if (!view) return false
  if (view.status !== "ready") return false
  return hasUsableStageData(view.data)
}

function dependencyIsNewer(
  profile: ProductInsightProfilePayload | null,
  stageId: ProductInsightStageId,
  dependencyId: ProductInsightStageId,
): boolean {
  const stageView = profile?.stages?.[stageId]
  const dependencyView = profile?.stages?.[dependencyId]
  if (!dependencyView) return true
  const dependencyCompletedAt = parseTimestamp(dependencyView.completedAt)
  if (dependencyCompletedAt === null) return true
  const stageCompletedAt = parseTimestamp(stageView?.completedAt)
  if (stageCompletedAt === null) return true
  return dependencyCompletedAt > stageCompletedAt
}

export function determinePipelineRunPlan(
  profile: ProductInsightProfilePayload | null,
  options: {
    forcedStageIds?: Iterable<ProductInsightStageId>
    allowedStageIds?: Iterable<ProductInsightStageId>
  } = {},
): PipelineRunPlan {
  const stageOrder = PRODUCT_INSIGHT_STAGE_DEFINITIONS.slice().sort(
    (a, b) => a.order - b.order,
  )

  const forcedStageIds = new Set<ProductInsightStageId>(
    options.forcedStageIds ?? stageOrder.map((stage) => stage.id),
  )

  const allowedStageIds = new Set<ProductInsightStageId>(
    options.allowedStageIds ?? stageOrder.map((stage) => stage.id),
  )

  const shouldRun = Object.fromEntries(
    stageOrder.map((stage) => [stage.id, false]),
  ) as Record<ProductInsightStageId, boolean>

  for (const stage of stageOrder) {
    if (!allowedStageIds.has(stage.id)) {
      shouldRun[stage.id] = false
      continue
    }

    const forced = forcedStageIds.has(stage.id)
    const ready = isStageReady(profile, stage.id)
    const dependencyScheduled = stage.dependencies.some(
      (dependency) => shouldRun[dependency],
    )
    const dependencyIncomplete = stage.dependencies.some(
      (dependency) => !isStageReady(profile, dependency),
    )
    const dependencyNewer = stage.dependencies.some((dependency) =>
      dependencyIsNewer(profile, stage.id, dependency),
    )

    const shouldConsider =
      forced ||
      !ready ||
      dependencyScheduled ||
      dependencyIncomplete ||
      dependencyNewer

    if (!shouldConsider) {
      shouldRun[stage.id] = false
      continue
    }

    shouldRun[stage.id] =
      forced ||
      !ready ||
      dependencyScheduled ||
      dependencyIncomplete ||
      dependencyNewer
  }

  return {
    shouldRun,
    forcedStageIds,
    allowedStageIds,
    orderedStageIds: stageOrder.map((stage) => stage.id),
  }
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

function buildProductContext(
  record: ProductRecord,
): ProductInsightProductContext {
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

function stageWhere(profileId: string, stage: PipelineStage) {
  return {
    profileId_stageId_providerType: {
      profileId,
      stageId: stage.id,
      providerType: stage.providerType,
    },
  }
}

async function markStagePending(profileId: string, stage: PipelineStage) {
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
  stage: PipelineStage,
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
  stage: PipelineStage,
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

function buildStageView<K extends ProductInsightStageId>(
  stageId: K,
  serialized: {
    data: ProductInsightStageDataById[K]
    metrics?: Record<string, unknown> | null
  },
): ProductInsightStageView<K> {
  const definition = PRODUCT_INSIGHT_STAGE_MAP[stageId]
  const stage = PIPELINE_STAGE_REGISTRY[stageId]
  const timestamp = new Date().toISOString()

  return {
    stageId,
    label: definition.label,
    providerType: stage.providerType,
    dependencies: stage.dependencies,
    renderer: definition.renderer,
    status: ProductInsightStatus.ready,
    data: serialized.data,
    metrics: serialized.metrics ?? null,
    errorMessage: null,
    startedAt: timestamp,
    completedAt: timestamp,
  }
}

function cloneStageViews(
  views: ProductInsightStageViewMap | undefined,
): ProductInsightStageViewMap {
  return { ...(views ?? {}) }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type PipelineResult = {
  profile: ProductInsightProfilePayload
  summary?: ProductInsightSummary | null
  summaryText?: string | null
}

function ensureStageDependencies(stageIds: Set<ProductInsightStageId>) {
  const queue = Array.from(stageIds)
  while (queue.length) {
    const current = queue.pop()
    if (!current) continue
    const definition = PRODUCT_INSIGHT_STAGE_MAP[current]
    if (!definition) continue
    for (const dependency of definition.dependencies) {
      if (!stageIds.has(dependency)) {
        stageIds.add(dependency)
        queue.push(dependency)
      }
    }
  }
}

export async function runProductInsightPipeline(job: {
  productId: string
  requestedByUserId?: string | null
  stageSetId?: ProductInsightStageSetId
  forcedStageIds?: Iterable<ProductInsightStageId>
  allowedStageIds?: Iterable<ProductInsightStageId>
  notifyOnCompletion?: boolean
  discussionsMode?: ProductInsightHarvestMode
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
  const stageSelection = resolveStageSet(job.stageSetId)
  const selectedStageSetId = job.stageSetId ?? stageSelection.stageSetId

  const forcedStageIds = job.forcedStageIds
    ? new Set(job.forcedStageIds)
    : new Set(stageSelection.forcedStageIds)

  const allowedStageIds = job.allowedStageIds
    ? new Set(job.allowedStageIds)
    : new Set(stageSelection.allowedStageIds)

  if (job.forcedStageIds) {
    for (const stageId of forcedStageIds) {
      allowedStageIds.add(stageId)
    }
  }

  ensureStageDependencies(allowedStageIds)

  const plan = determinePipelineRunPlan(existingProfile, {
    forcedStageIds,
    allowedStageIds,
  })

  const profileRef = await ensureProfilePending(productRecord.id)
  const productContext = buildProductContext(productRecord)

  const shared = buildInitialSharedState(existingProfile)
  const stageViews = cloneStageViews(existingProfile?.stages)

  const stageContext: PipelineStageContext = {
    productId: productRecord.id,
    websiteUrl: productRecord.websiteUrl,
    product: productContext,
    profile: existingProfile,
    requestedByUserId: job.requestedByUserId ?? null,
    stageViews,
    shared,
    requestedModes: job.discussionsMode
      ? { discussions: job.discussionsMode }
      : undefined,
  }

  const orderedStages = plan.orderedStageIds
    .filter((stageId) => plan.allowedStageIds.has(stageId))
    .map((stageId) => PIPELINE_STAGE_REGISTRY[stageId])
    .filter((stage): stage is PipelineStage => Boolean(stage))

  for (const stage of orderedStages) {
    if (!plan.shouldRun[stage.id]) {
      continue
    }

    await markStagePending(profileRef.id, stage)

    const maxAttempts = Math.max(1, stage.retryPolicy?.maxAttempts ?? 1)
    const backoffMs = Math.max(0, stage.retryPolicy?.backoffMs ?? 0)

    let attempt = 0

    while (attempt < maxAttempts) {
      attempt += 1
      try {
        console.info("[productInsights:pipeline] stage starting", {
          productId: productRecord.id,
          stageId: stage.id,
          stageSetId: selectedStageSetId,
          attempt,
          maxAttempts,
        })

        const result = await stage.execute(stageContext)
        const serialized = stage.serialize(result, stageContext)

        await markStageReady(
          profileRef.id,
          stage,
          serialized.data,
          serialized.metrics ?? null,
        )

        mergeSharedState(shared, serialized.shared)
        stageViews[stage.id] = buildStageView(stage.id, serialized)

        console.info("[productInsights:pipeline] stage completed", {
          productId: productRecord.id,
          stageId: stage.id,
        })

        break
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Stage execution failed"

        if (attempt >= maxAttempts) {
          await markStageFailed(profileRef.id, stage, message)
          await updateProfileStatus(
            productRecord.id,
            ProductInsightStatus.failed,
            {
              errorMessage: message,
            },
          )
          console.error("[productInsights:pipeline] stage failed", {
            productId: productRecord.id,
            stageId: stage.id,
            stageSetId: selectedStageSetId,
            attempt,
            maxAttempts,
            message,
            error,
          })
          throw error
        }

        console.warn("[productInsights:pipeline] stage attempt failed", {
          productId: productRecord.id,
          stageId: stage.id,
          stageSetId: selectedStageSetId,
          attempt,
          maxAttempts,
          message,
          error,
        })

        if (backoffMs > 0) {
          await sleep(backoffMs)
        }
      }
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

  if (job.notifyOnCompletion !== false) {
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
  }

  return {
    profile: finalProfile,
    summary: shared.summary ?? null,
    summaryText: shared.summaryText ?? null,
  }
}
