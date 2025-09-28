"use server"

import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import {
  enqueueProductInsightPipelineJob,
  getPipelineJobState,
  markPipelineJobComplete,
} from "@/lib/server/productInsights/pipelineQueue"
import { runProductInsightPipeline } from "@/lib/server/productInsights/pipelineRunner"
import {
  insightProfileSelect,
  serializeInsightProfile,
} from "@/lib/server/productInsights/profile"
import type {
  ProductInsightProfilePayload,
  ProductInsightProfileView,
  ProductInsightStageSetId,
} from "@/types/product-insights"

async function loadProfileForProduct(
  productId: string,
): Promise<ProductInsightProfilePayload | null> {
  const snapshot = await prisma.productInsightProfile.findUnique({
    where: { productId },
    select: insightProfileSelect,
  })

  const profile = serializeInsightProfile(snapshot)
  if (!profile) return null

  profile.pipelineJobState = await getPipelineJobState(productId)
  return profile
}

export async function getProductInsightProfile(
  slug: string,
): Promise<ProductInsightProfileView> {
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
      insightProfile: { select: insightProfileSelect },
    },
  })

  if (!record) {
    throw new Error("Product not found")
  }

  const profile = serializeInsightProfile(record.insightProfile)
  if (profile) {
    profile.pipelineJobState = await getPipelineJobState(record.id)
  }

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    websiteUrl: record.websiteUrl,
    insightProfile: profile,
  }
}

export async function scheduleProductInsightsPipeline(
  slug: string,
  stageSetId: ProductInsightStageSetId = "default",
): Promise<{
  profile: ProductInsightProfilePayload | null
  executedInline: boolean
  alreadyQueued: boolean
}> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  console.info("[productInsights:action] pipeline requested", {
    productId: product.id,
    productSlug: product.slug,
    stageSetId,
  })

  const enqueueResult = await enqueueProductInsightPipelineJob({
    productId: product.id,
    requestedByUserId: product.userId,
    stageSetId,
  })

  if (enqueueResult.queued) {
    const profile = await loadProfileForProduct(product.id)
    if (profile) {
      profile.pipelineJobState = "queued"
    }

    console.info("[productInsights:action] pipeline enqueued", {
      productId: product.id,
      stageSetId,
    })

    return { profile, executedInline: false, alreadyQueued: false }
  }

  if (enqueueResult.reason === "duplicate") {
    const profile = await loadProfileForProduct(product.id)

    console.info("[productInsights:action] pipeline already active", {
      productId: product.id,
      stageSetId,
    })

    return { profile, executedInline: false, alreadyQueued: true }
  }

  console.warn("[productInsights:action] queue unavailable, executing inline", {
    productId: product.id,
    reason: enqueueResult.reason,
    stageSetId,
  })

  const result = await runProductInsightPipeline({
    productId: product.id,
    requestedByUserId: product.userId,
    stageSetId,
  })

  await markPipelineJobComplete(product.id).catch(() => undefined)

  const profile = result.profile
  profile.pipelineJobState = "idle"

  return { profile, executedInline: true, alreadyQueued: false }
}
