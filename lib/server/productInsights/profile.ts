import type { Prisma } from "@/lib/vendor/prisma/client"

import type {
  ProductInsightCommunityStageData,
  ProductInsightDiscussionStageData,
  ProductInsightProfilePayload,
  ProductInsightStageDataById,
  ProductInsightStageId,
  ProductInsightStageMetrics,
  ProductInsightStageViewMap,
  ProductInsightStatus,
  ProductInsightSnapshotStageData,
  ProductInsightReportStageData,
} from "@/types/product-insights"
import {
  PRODUCT_INSIGHT_STAGE_DEFINITIONS,
  PRODUCT_INSIGHT_STAGE_MAP,
} from "@/lib/server/productInsights/stages"

export const insightProfileSelect = {
  id: true,
  productId: true,
  status: true,
  errorMessage: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
  stages: {
    select: {
      id: true,
      stageId: true,
      providerType: true,
      status: true,
      data: true,
      metrics: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  },
} satisfies Prisma.ProductInsightProfileSelect

export type InsightProfileRecord = Prisma.ProductInsightProfileGetPayload<{
  select: typeof insightProfileSelect
}>

type StageRecord = InsightProfileRecord["stages"][number]

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value.filter((entry): entry is string => typeof entry === "string")
  return items.length ? items : null
}

function parseSnapshotData(
  value: Prisma.JsonValue | null,
): ProductInsightSnapshotStageData | null {
  const record = asRecord(value)
  if (!record) return null

  const discoveredUrls = parseStringArray(record.discoveredUrls)
  const pages = Array.isArray(record.pages)
    ? (record.pages as unknown[] as ProductInsightSnapshotStageData["pages"])
    : null
  const summary = record.summary
    ? (record.summary as ProductInsightSnapshotStageData["summary"])
    : null

  return {
    sitemapUrl:
      typeof record.sitemapUrl === "string" ? record.sitemapUrl : undefined,
    discoveredUrls,
    pages,
    summary,
    summaryText:
      typeof record.summaryText === "string" ? record.summaryText : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    fetchedAt:
      typeof record.fetchedAt === "string" ? record.fetchedAt : undefined,
  }
}

function parseCommunityData(
  value: Prisma.JsonValue | null,
): ProductInsightCommunityStageData | null {
  const record = asRecord(value)
  if (!record) return null

  const queries = Array.isArray(record.queries)
    ? (record.queries as unknown[] as ProductInsightCommunityStageData["queries"])
    : []
  const subreddits = Array.isArray(record.subreddits)
    ? (record.subreddits as unknown[] as ProductInsightCommunityStageData["subreddits"])
    : []

  return {
    queries,
    subreddits,
    model: typeof record.model === "string" ? record.model : undefined,
    discoveredAt:
      typeof record.discoveredAt === "string" ? record.discoveredAt : undefined,
  }
}

function parseDiscussionData(
  value: Prisma.JsonValue | null,
): ProductInsightDiscussionStageData | null {
  const record = asRecord(value)
  if (!record) return null

  const queries = Array.isArray(record.queries)
    ? (record.queries as unknown[] as ProductInsightDiscussionStageData["queries"])
    : []
  const threads = Array.isArray(record.threads)
    ? (record.threads as unknown[] as ProductInsightDiscussionStageData["threads"])
    : []
  const insights = record.insights
    ? (record.insights as ProductInsightDiscussionStageData["insights"])
    : null

  return {
    queries,
    threads,
    insights,
    model: typeof record.model === "string" ? record.model : undefined,
    discoveredAt:
      typeof record.discoveredAt === "string" ? record.discoveredAt : undefined,
  }
}

function parseReportData(
  value: Prisma.JsonValue | null,
): ProductInsightReportStageData | null {
  const record = asRecord(value)
  if (!record) return null

  if (record.report && typeof record.report === "object") {
    return {
      report: record.report as ProductInsightReportStageData["report"],
      model: typeof record.model === "string" ? record.model : undefined,
      generatedAt:
        typeof record.generatedAt === "string"
          ? record.generatedAt
          : undefined,
    }
  }

  return null
}

function parseStageData(
  stageId: ProductInsightStageId,
  value: Prisma.JsonValue | null,
): ProductInsightStageDataById[ProductInsightStageId] | null {
  switch (stageId) {
    case "product.snapshot":
      return parseSnapshotData(value)
    case "reddit.communities":
      return parseCommunityData(value)
    case "reddit.discussions":
      return parseDiscussionData(value)
    case "report.comprehensive":
      return parseReportData(value)
    default:
      return null
  }
}

function parseMetrics(
  raw: Prisma.JsonValue | null,
): ProductInsightStageMetrics | null {
  const record = asRecord(raw)
  if (!record) return null
  return record
}

function coerceStageRecord(
  stageId: ProductInsightStageId,
  records: StageRecord[],
): StageRecord | null {
  const definition = PRODUCT_INSIGHT_STAGE_MAP[stageId]
  const byProvider = records.find(
    (entry) => entry.stageId === stageId && entry.providerType === definition.providerType,
  )
  if (byProvider) return byProvider
  return records.find((entry) => entry.stageId === stageId) ?? null
}

export function serializeInsightProfile(
  record: InsightProfileRecord | null,
): ProductInsightProfilePayload | null {
  if (!record) return null

  const stageRecords = record.stages ?? []
  const stages: ProductInsightStageViewMap = {}

  for (const definition of PRODUCT_INSIGHT_STAGE_DEFINITIONS) {
    const stageRecord = coerceStageRecord(definition.id, stageRecords)
    const data = stageRecord
      ? (parseStageData(definition.id, stageRecord.data) as ProductInsightStageDataById[typeof definition.id] | null)
      : null

    stages[definition.id] = {
      stageId: definition.id,
      label: definition.label,
      providerType: definition.providerType,
      dependencies: definition.dependencies,
      renderer: definition.renderer,
      status: (stageRecord?.status ?? record.status) as ProductInsightStatus,
      data,
      metrics: parseMetrics(stageRecord?.metrics ?? null),
      errorMessage: stageRecord?.errorMessage ?? undefined,
      startedAt: stageRecord?.startedAt
        ? stageRecord.startedAt.toISOString()
        : null,
      completedAt: stageRecord?.completedAt
        ? stageRecord.completedAt.toISOString()
        : null,
    }
  }

  const snapshotStage = stages["product.snapshot"]
  const communityStage = stages["reddit.communities"]
  const discussionStage = stages["reddit.discussions"]
  const reportStage = stages["report.comprehensive"]

  const snapshotData = snapshotStage?.data as ProductInsightSnapshotStageData | null
  const communityData = communityStage?.data as ProductInsightCommunityStageData | null
  const discussionData = discussionStage?.data as ProductInsightDiscussionStageData | null
  const reportData = reportStage?.data as ProductInsightReportStageData | null

  return {
    id: record.id,
    productId: record.productId,
    status: snapshotStage?.status ?? (record.status as ProductInsightStatus),
    errorMessage: snapshotStage?.errorMessage ?? record.errorMessage ?? undefined,
    lastRunAt: record.lastRunAt ? record.lastRunAt.toISOString() : null,
    stages,
    sitemapUrl: snapshotData?.sitemapUrl ?? null,
    discoveredUrls: snapshotData?.discoveredUrls ?? null,
    pages: snapshotData?.pages ?? null,
    summary: snapshotData?.summary ?? null,
    summaryText: snapshotData?.summaryText ?? null,
    model: snapshotData?.model ?? null,
    subredditQueries: communityData?.queries ?? null,
    subreddits: communityData?.subreddits ?? null,
    subredditStatus: communityStage?.status ?? null,
    subredditErrorMessage: communityStage?.errorMessage ?? null,
    subredditModel: communityData?.model ?? null,
    redditDiscussionQueries: discussionData?.queries ?? null,
    redditDiscussions: discussionData?.threads ?? null,
    redditInsights: discussionData?.insights ?? null,
    redditStatus: discussionStage?.status ?? null,
    redditErrorMessage: discussionStage?.errorMessage ?? null,
    redditModel: discussionData?.model ?? null,
    redditMode: discussionData?.mode ?? null,
    finalReport: reportData?.report ?? null,
    finalReportStatus: reportStage?.status ?? null,
    finalReportErrorMessage: reportStage?.errorMessage ?? null,
    finalReportModel: reportData?.model ?? null,
    lastCrawledAt: snapshotStage?.completedAt ?? null,
    lastSubredditDiscoveryAt: communityStage?.completedAt ?? null,
    lastRedditDiscoveryAt: discussionStage?.completedAt ?? null,
    lastFinalReportAt: reportStage?.completedAt ?? null,
    createdAt: record.createdAt?.toISOString() ?? null,
    updatedAt: record.updatedAt?.toISOString() ?? null,
  }
}
