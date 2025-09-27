"use server"

import {
  crawlProductWebsite,
  synthesizeProductIdea,
} from "@/lib/server/productIdeas"
import prisma from "@/lib/prisma"
import { requireManageableProduct } from "@/lib/server/productAccess"
import { ProductIdeaProfileStatus, Prisma } from "@/lib/vendor/prisma/client"
import type {
  ProductIdeaProfileView,
  SerializedIdeaProfile,
} from "@/types/product-ideas"
import { buildProductIdeaSummaryText } from "@/lib/server/productIdeas/summary"
import type {
  ProductIdeaPageSnapshot,
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
  status: true,
  errorMessage: true,
  model: true,
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
  const summary = record.summary
    ? (record.summary as ProductIdeaSummary)
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
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastCrawledAt: record.lastCrawledAt
      ? record.lastCrawledAt.toISOString()
      : null,
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

    await prisma.productIdeaProfile.update({
      where: { productId: productRecord.id },
      data: {
        status: ProductIdeaProfileStatus.failed,
        errorMessage: message,
        lastCrawledAt: new Date(),
      },
    }).catch(() => {
      /* ignore */
    })

    throw error
  }
}
