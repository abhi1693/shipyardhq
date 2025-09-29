"use server"

import { auth } from "@clerk/nextjs/server"

import prisma from "@/lib/prisma"
import { checkRole } from "@/lib/roles"
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
} from "@/types/product-insights"
import type {
  SchedulePipelineOptions,
  SchedulePipelineResult,
} from "@/actions/member/products/insights"

async function requireAdmin() {
  const isAdmin = await checkRole("admin")
  if (!isAdmin) {
    throw new Error("Unauthorized")
  }
}

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

export async function getAdminProductInsightProfile(
  productId: string,
): Promise<ProductInsightProfileView> {
  await requireAdmin()

  const record = await prisma.product.findUnique({
    where: { id: productId },
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

  const profile = await loadProfileForProduct(record.id)

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    websiteUrl: record.websiteUrl,
    insightProfile: profile,
  }
}

export async function scheduleAdminProductInsightsPipeline(
  slug: string,
  options: SchedulePipelineOptions = {},
): Promise<SchedulePipelineResult> {
  await requireAdmin()

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      userId: true,
    },
  })

  if (!product) {
    throw new Error("Product not found")
  }

  const { stageSetId = "default", discussionsMode } = options

  const { userId: adminUserId } = await auth()
  const requestedByUserId = adminUserId ?? product.userId ?? undefined

  console.info("[productInsights:admin] pipeline requested", {
    productId: product.id,
    productSlug: product.slug,
    stageSetId,
    discussionsMode,
  })

  const enqueueResult = await enqueueProductInsightPipelineJob({
    productId: product.id,
    requestedByUserId,
    stageSetId,
    discussionsMode: discussionsMode ?? null,
  })

  if (enqueueResult.queued) {
    const profile = await loadProfileForProduct(product.id)
    if (profile) {
      profile.pipelineJobState = "queued"
      if (discussionsMode) {
        profile.redditMode = discussionsMode
      }
    }

    console.info("[productInsights:admin] pipeline enqueued", {
      productId: product.id,
      stageSetId,
    })

    return {
      profile,
      executedInline: false,
      alreadyQueued: false,
    }
  }

  if (enqueueResult.reason === "duplicate") {
    const profile = await loadProfileForProduct(product.id)
    if (profile && discussionsMode) {
      profile.redditMode = discussionsMode
    }

    console.info("[productInsights:admin] pipeline already active", {
      productId: product.id,
      stageSetId,
    })

    return {
      profile,
      executedInline: false,
      alreadyQueued: true,
    }
  }

  console.warn("[productInsights:admin] queue unavailable, executing inline", {
    productId: product.id,
    reason: enqueueResult.reason,
    stageSetId,
  })

  const result = await runProductInsightPipeline({
    productId: product.id,
    requestedByUserId,
    stageSetId,
    discussionsMode,
  })

  await markPipelineJobComplete(product.id).catch(() => undefined)

  const profile = result.profile
  profile.pipelineJobState = "idle"
  profile.redditMode = discussionsMode ?? profile.redditMode ?? null

  return {
    profile,
    executedInline: true,
    alreadyQueued: false,
  }
}
