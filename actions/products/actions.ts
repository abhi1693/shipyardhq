"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dispatchEventAsync } from "@/lib/server/events"
import "@/lib/server/badges" // register badge listeners
import { deleteBlob, deleteBlobPrefix, isManagedBlobUrl } from "@/lib/blob"
import "@/lib/server/plans" // register default-plan listeners
import { Prisma, PricingModel, ProductType } from "@/lib/vendor/prisma/client"
import { slugify } from "@/lib/utils"
import { generateVerificationTxtFromWebsite } from "@/lib/products/verification"
import {
  revalidateCategory,
  revalidateCategories,
  revalidateLeaderboard,
  revalidateProduct,
  revalidateProducts,
  revalidateAlternativeProduct,
  revalidateAlternativeProducts,
} from "@/lib/cache/revalidate"
import { getDefaultPlanWithFeatures } from "@/lib/server/planDefaults"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { getRootDomain } from "@/lib/domain"
import { productForEditWizardSelect } from "@/types/product-wizard"
import { refreshHomepageFeedCache } from "@/lib/server/homepage/feed"
import { invalidateSearchSuggestionsCache } from "@/lib/server/search/suggestions-cache"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"
import { resolveTxtRecords } from "@/lib/server/dns"
import { resolveEffectivePlanGrant } from "@/lib/products/effective-plan-grants"

async function refreshHomepageFeedCacheAfterProductChange(
  reason: string,
  productId?: string,
) {
  try {
    return await refreshHomepageFeedCache()
  } catch (error) {
    console.error(
      "Failed to refresh homepage feed cache after product change",
      {
        reason,
        productId,
        error,
      },
    )
    return null
  }
}

async function invalidateSearchSuggestionsAfterProductChange(
  reason: string,
  productId?: string,
) {
  try {
    return await invalidateSearchSuggestionsCache(reason)
  } catch (error) {
    console.error(
      "Failed to invalidate search suggestions after product change",
      {
        reason,
        productId,
        error,
      },
    )
    return null
  }
}

async function invalidateProductAnalyticsAfterProductChange(
  reason: string,
  productId?: string,
) {
  if (!productId) return null

  try {
    return await invalidateProductAnalyticsRecordCache(productId, reason)
  } catch (error) {
    console.error(
      "Failed to invalidate product analytics after product change",
      {
        reason,
        productId,
        error,
      },
    )
    return null
  }
}

async function generateUniqueSlug(base: string): Promise<string> {
  const clean = slugify(base)
  if (!clean) return `product-${Math.random().toString(36).slice(2, 6)}`
  let candidate = clean
  let i = 2
  // Loop until unique
  // Note: findUnique is faster when exact, but loop is simple here
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
    })
    if (!existing) return candidate
    candidate = `${clean}-${i++}`
  }
}

export async function getProductById(id: string) {
  const { userId } = await auth.protect()
  const currentUser = await getActiveUserByClerkId(userId)
  if (!currentUser) return null

  try {
    const now = new Date()
    const product = await prisma.product.findUnique({
      where: { id, userId: currentUser.id },
      include: {
        category: true,
        user: true,
        metadata: true,
        analytics: true,
        verification: true,
        ProductMedia: true,
        ProductBadge: true,
        planGrants: {
          where: {
            status: "active",
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            id: true,
            source: true,
            startsAt: true,
            createdAt: true,
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
                type: true,
                boostForDays: true,
                isDefault: true,
                assignments: {
                  include: {
                    feature: true,
                  },
                },
              },
            },
          },
        },
        alternatives: {
          include: {
            categories: true,
          },
        },
      },
    })
    if (!product) return null

    const { planGrants, ...productRecord } = product
    const effectiveGrant = resolveEffectivePlanGrant(planGrants)
    const defaultPlan = effectiveGrant
      ? null
      : await getDefaultPlanWithFeatures()
    return {
      ...productRecord,
      plan: effectiveGrant?.plan ?? defaultPlan ?? null,
    }
  } catch (error) {
    console.error("Error fetching product by ID:", error)
    throw new Error("Failed to fetch product")
  }
}

export async function getProductForEditWizard(id: string) {
  const { userId } = await auth.protect()
  const currentUser = await getActiveUserByClerkId(userId)
  if (!currentUser) return null

  try {
    return await prisma.product.findUnique({
      where: { id, userId: currentUser.id },
      select: productForEditWizardSelect,
    })
  } catch (error) {
    console.error("Error fetching product for wizard:", error)
    throw new Error("Failed to fetch product")
  }
}

export async function createProductAction(formData: FormData) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }

  const currentUser = await getActiveUserByClerkId(clerkId)
  if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const providedId = formData.get("id")?.toString().trim()
  const name = formData.get("name")!.toString().trim()
  const tagline = formData.get("tagline")!.toString().trim()
  const description = formData.get("description")!.toString().trim()
  const websiteUrl = formData.get("websiteUrl")!.toString().trim()
  const logo = formData.get("logo")!.toString().trim()
  const categoryId = formData.get("categoryId")!.toString()
  const userId = currentUser.id
  const requestedUserId = formData.get("userId")?.toString()
  if (requestedUserId && requestedUserId !== currentUser.id) {
    return { error: "Not authorized to create products for this user." }
  }
  const slug = formData.get("slug")?.toString().trim()
  const type =
    ProductType[formData.get("type")!.toString() as keyof typeof ProductType]
  const pricingModel =
    PricingModel[
      formData.get("pricingModel")!.toString() as keyof typeof PricingModel
    ]

  const githubUrl = formData.get("githubUrl")?.toString().trim()
  const twitterUrl = formData.get("twitterUrl")?.toString().trim()
  const videoUrl = formData.get("videoUrl")?.toString().trim()
  const contactEmail = formData.get("contactEmail")?.toString().trim()
  const utmCampaign = formData.get("utmCampaign")?.toString().trim()

  const startingPriceCentsRaw = formData.get("startingPriceCents")?.toString()
  const startingPriceCents = startingPriceCentsRaw
    ? Number(startingPriceCentsRaw)
    : undefined
  const currencyCode =
    formData.get("currencyCode")?.toString().trim() || undefined
  const bannerImage =
    formData.get("bannerImage")?.toString().trim() || undefined

  let keywords: string[] | undefined
  let platforms: string[] | undefined
  let categoryIds: string[] = []
  try {
    const kw = formData.get("keywords")?.toString()
    if (kw) keywords = JSON.parse(kw)
  } catch {}
  try {
    const rawCategoryIds = formData.get("categoryIds")?.toString()
    if (rawCategoryIds) {
      const parsed = JSON.parse(rawCategoryIds)
      if (Array.isArray(parsed)) {
        categoryIds = parsed
          .filter((value) => typeof value === "string" && value.length > 0)
          .map((value) => value as string)
      }
    }
  } catch {}
  try {
    const pf = formData.get("platforms")?.toString()
    if (pf) platforms = JSON.parse(pf)
  } catch {}

  let alternativeIds: string[] = []
  try {
    const rawAlternatives = formData.get("alternativeIds")?.toString()
    if (rawAlternatives) {
      const parsed = JSON.parse(rawAlternatives)
      if (Array.isArray(parsed)) {
        alternativeIds = parsed
          .filter((value) => typeof value === "string" && value.length > 0)
          .map((value) => value as string)
      }
    }
  } catch {}

  let galleryMediaUrls: string[] = []
  try {
    const rawGallery = formData.get("galleryMedia")?.toString()
    if (rawGallery) {
      const parsed = JSON.parse(rawGallery)
      if (Array.isArray(parsed)) {
        galleryMediaUrls = parsed
          .filter((value) => typeof value === "string" && value.length > 0)
          .map((value) => value as string)
      }
    }
  } catch {}

  try {
    // Uniqueness: websiteUrl must be unique
    const existingWebsite = await prisma.product.findFirst({
      where: { websiteUrl },
    })
    if (existingWebsite) {
      return { error: "A product with this website URL already exists." }
    }

    // Slug: auto-generate if missing, ensure unique
    const finalSlug = await generateUniqueSlug(
      slug && slug.length ? slug : name || new URL(websiteUrl).hostname,
    )

    const verificationTxt = generateVerificationTxtFromWebsite(websiteUrl)
    // Attempt live DNS check so new products can start verified if TXT already set
    let initialVerified = false
    try {
      const domain = getRootDomain(websiteUrl)
      if (domain) {
        const txtRecords = await resolveTxtRecords(domain)
        const flattened = txtRecords.flat().map((t) => t.trim())
        initialVerified = flattened.some(
          (txt) => txt === verificationTxt.trim(),
        )
      }
    } catch {
      // Ignore DNS errors during creation; user can verify later
    }

    const uniqueAlternativeIds = Array.from(new Set(alternativeIds))
    const uniqueCategoryIds = Array.from(
      new Set(categoryIds.length ? categoryIds : [categoryId]),
    ).slice(0, 3)
    const uniqueGalleryMediaUrls = Array.from(new Set(galleryMediaUrls)).slice(
      0,
      6,
    )

    const created = await prisma.product.create({
      data: {
        id: providedId || undefined,
        name,
        slug: finalSlug,
        tagline,
        description,
        websiteUrl,
        logo,
        categoryId: uniqueCategoryIds[0] ?? categoryId,
        userId,
        type,
        pricingModel,
        status: "draft",
        publishedAt: null,
        startingPriceCents,
        currencyCode,
        bannerImage,
        keywords,
        platforms: (platforms as any) ?? undefined,
        categories: {
          create: uniqueCategoryIds.map((nextCategoryId) => ({
            categoryId: nextCategoryId,
          })),
        },
        ProductMedia: uniqueGalleryMediaUrls.length
          ? {
              create: uniqueGalleryMediaUrls.map((imageUrl) => ({
                imageUrl,
              })),
            }
          : undefined,
        metadata: {
          create: {
            githubUrl,
            twitterUrl,
            videoUrl,
            contactEmail,
            utmCampaign: utmCampaign || undefined,
          },
        },
        analytics: {
          create: {},
        },
        verification: {
          create: {
            verificationTxt,
            isVerified: initialVerified,
            verifiedAt: initialVerified ? new Date() : null,
          },
        },
        alternatives: uniqueAlternativeIds.length
          ? {
              connect: uniqueAlternativeIds.map((altId) => ({ id: altId })),
            }
          : undefined,
      },
    })
    // Fire domain event for listeners (e.g., auto badges) without blocking the response
    dispatchEventAsync(
      "product.created",
      { productId: created.id },
      { context: { productId: created.id } },
    )

    const sideEffects: Promise<unknown>[] = [
      // Invalidate public caches affected by a new product
      Promise.resolve().then(() => revalidateProducts()),
      Promise.resolve().then(() => revalidateLeaderboard()),
      refreshHomepageFeedCacheAfterProductChange("product.created", created.id),
      invalidateSearchSuggestionsAfterProductChange(
        "product.created",
        created.id,
      ),
      invalidateProductAnalyticsAfterProductChange(
        "product.created",
        created.id,
      ),
    ]
    uniqueCategoryIds.forEach((nextCategoryId) => {
      sideEffects.push(
        Promise.resolve().then(() => revalidateCategory(nextCategoryId)),
      )
    })

    if (uniqueAlternativeIds.length) {
      sideEffects.push(
        Promise.resolve().then(() => revalidateAlternativeProducts()),
      )
      uniqueAlternativeIds.forEach((altId) => {
        sideEffects.push(
          Promise.resolve().then(() => revalidateAlternativeProduct(altId)),
        )
      })
    }

    const results = await Promise.allSettled(sideEffects)
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )

    if (failures.length) {
      console.error("Product created but follow-up tasks failed", {
        productId: created.id,
        reasons: failures.map((failure) => failure.reason),
      })
    }

    return { success: true, productId: created.id, slug: created.slug }
  } catch (error) {
    console.error("Error creating product:", error)
    const code = (error as any)?.code
    if (code === "P2002") {
      return {
        error: "Duplicate unique field (likely slug). Choose a different slug.",
      }
    }
    const message = error instanceof Error ? error.message : null
    return {
      error: message || "Failed to create product",
    }
  }
}

export async function updateProductAction(
  id: string,
  data: {
    name: string
    categoryId: string
    categoryIds?: string[]
    description: string
    tagline: string
    websiteUrl: string
    logo: string
    type: Prisma.ProductUpdateInput["type"]
    pricingModel: Prisma.ProductUpdateInput["pricingModel"]
    slug?: string
    status?: "draft" | "published" | "archived"
    publishedAt?: string | null
    startingPriceCents?: number | null
    currencyCode?: string | null
    bannerImage?: string | null
    keywords?: string[]
    platforms?: (
      | "web"
      | "ios"
      | "android"
      | "mac"
      | "windows"
      | "linux"
      | "chrome_extension"
      | "firefox_extension"
    )[]
    githubUrl?: string | null
    twitterUrl?: string | null
    videoUrl?: string | null
    contactEmail?: string | null
    utmCampaign?: string | null
    alternativeIds?: string[]
  },
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }

  const currentUser = await getActiveUserByClerkId(clerkId)
  if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const {
    name,
    categoryId,
    description,
    videoUrl,
    contactEmail,
    githubUrl,
    twitterUrl,
    logo,
    tagline,
    type,
    pricingModel,
  } = data

  // Load current product for comparisons
  const current = await prisma.product.findUnique({
    where: { id },
    include: {
      verification: true,
      alternatives: { select: { id: true } },
      categories: { select: { categoryId: true } },
    },
  })

  if (!current) {
    return { error: "Product not found" }
  }

  const ownsProduct = current.userId === currentUser.id
  if (!ownsProduct) {
    return { error: "Not authorized to edit this product" }
  }

  if (typeof data.websiteUrl === "string" && data.websiteUrl.trim().length) {
    const normalizedIncoming = data.websiteUrl.trim()
    if (normalizedIncoming && normalizedIncoming !== current.websiteUrl) {
      return { error: "Members cannot change Website URL after creation." }
    }
  }
  if (typeof data.slug === "string" && data.slug.trim().length) {
    const incomingSlug = data.slug.trim()
    if (incomingSlug && incomingSlug !== current.slug) {
      return {
        error: "Members cannot change product URL/slug after creation.",
      }
    }
  }
  if (data.status && data.status !== current.status) {
    return { error: "Members cannot change product status." }
  }

  try {
    const prev = await prisma.product.findUnique({
      where: { id },
      select: { logo: true, bannerImage: true },
    })

    const previousAlternativeIds = current.alternatives
      ? current.alternatives.map((alt: { id: string }) => alt.id)
      : []
    const nextAlternativeIds = Array.isArray(data.alternativeIds)
      ? Array.from(
          new Set(
            data.alternativeIds.filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0,
            ),
          ),
        )
      : undefined
    const previousCategoryIds = current.categories?.length
      ? current.categories.map(
          (entry: { categoryId: string }) => entry.categoryId,
        )
      : [current.categoryId]
    const nextCategoryIds = Array.from(
      new Set(
        Array.isArray(data.categoryIds) && data.categoryIds.length
          ? data.categoryIds.filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0,
            )
          : [categoryId],
      ),
    ).slice(0, 3)
    const primaryCategoryId = nextCategoryIds[0] ?? categoryId

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        categoryId: primaryCategoryId,
        tagline: tagline?.trim(),
        description: description?.trim(),
        logo: logo?.trim(),
        type,
        pricingModel,
        metadata: {
          update: {
            githubUrl: githubUrl?.trim() || null,
            twitterUrl: twitterUrl?.trim() || null,
            videoUrl: videoUrl?.trim() || null,
            contactEmail: contactEmail?.trim() || null,
            utmCampaign: (data.utmCampaign || undefined) ?? undefined,
          },
        },
        startingPriceCents: data.startingPriceCents ?? undefined,
        currencyCode: data.currencyCode ?? undefined,
        bannerImage: data.bannerImage ?? undefined,
        keywords: data.keywords as any,
        platforms: data.platforms as any,
        alternatives:
          nextAlternativeIds !== undefined
            ? {
                set: nextAlternativeIds.map((altId) => ({ id: altId })),
              }
            : undefined,
        categories: {
          deleteMany: {},
          create: nextCategoryIds.map((nextCategoryId) => ({
            categoryId: nextCategoryId,
          })),
        },
      },
    })

    // Fire update event (available for future listeners)
    dispatchEventAsync(
      "product.updated",
      { productId: id },
      { context: { productId: id } },
    )

    // Cleanup old blobs if logo/banner changed and are hosted in managed R2.
    const deletions: Promise<any>[] = []
    if (
      prev?.logo &&
      prev.logo !== updated.logo &&
      isManagedBlobUrl(prev.logo)
    ) {
      deletions.push(deleteBlob(prev.logo).catch(() => {}))
    }
    if (
      prev?.bannerImage &&
      prev.bannerImage !== updated.bannerImage &&
      isManagedBlobUrl(prev.bannerImage)
    ) {
      deletions.push(deleteBlob(prev.bannerImage).catch(() => {}))
    }
    if (deletions.length) await Promise.all(deletions)

    // Invalidate caches for updated product
    if (typeof id === "string" && id) revalidateProduct(id)
    Array.from(new Set([...previousCategoryIds, ...nextCategoryIds])).forEach(
      (nextCategoryId) => revalidateCategory(nextCategoryId),
    )
    revalidateLeaderboard()
    await refreshHomepageFeedCacheAfterProductChange("product.updated", id)
    await invalidateSearchSuggestionsAfterProductChange("product.updated", id)
    await invalidateProductAnalyticsAfterProductChange("product.updated", id)
    if (nextAlternativeIds !== undefined || previousAlternativeIds.length) {
      const idsToRevalidate = new Set<string>(previousAlternativeIds)
      if (nextAlternativeIds) {
        nextAlternativeIds.forEach((altId) => idsToRevalidate.add(altId))
      }
      idsToRevalidate.forEach((altId) => revalidateAlternativeProduct(altId))
      if (nextAlternativeIds !== undefined) {
        revalidateAlternativeProducts()
      }
    }

    if (updated.status === "published" && current.status !== "published") {
      dispatchEventAsync(
        "product.published",
        { productId: updated.id },
        { context: { productId: updated.id } },
      )
    }

    return updated
  } catch (error) {
    console.error("Error updating product:", error)
    const message = error instanceof Error ? error.message : null
    return { error: message || "Failed to update product" }
  }
}

export async function deleteProductAction(id: string) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return { error: "Unauthenticated" }
    const currentUser = await getActiveUserByClerkId(clerkId)
    if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }

    // Fetch user to compute blob prefix, then delete entire folder
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { clerkId: true } },
      },
    })
    if (!product) return { error: "Product not found" }

    if (product.userId !== currentUser.id) {
      return { error: "Only the owner can delete this product" }
    }

    const userClerkId = product.user?.clerkId
    if (userClerkId) {
      const prefix = `${userClerkId}/products/${product.id}/`
      try {
        await deleteBlobPrefix(prefix)
      } catch (e) {
        console.warn("Failed to delete blob prefix (continuing):", prefix, e)
      }
    }

    const result = await prisma.product.delete({ where: { id } })
    // Fire delete event (badges are cascaded in DB, but listeners may react)
    dispatchEventAsync(
      "product.deleted",
      { productId: id },
      { context: { productId: id } },
    )
    // Invalidate public caches heavily, product removed
    revalidateProducts()
    revalidateCategories()
    revalidateLeaderboard()
    await refreshHomepageFeedCacheAfterProductChange("product.deleted", id)
    await invalidateSearchSuggestionsAfterProductChange("product.deleted", id)
    await invalidateProductAnalyticsAfterProductChange("product.deleted", id)
    return result
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      console.warn("Delete skipped, product already removed:", id)
      revalidateProducts()
      revalidateCategories()
      revalidateLeaderboard()
      await refreshHomepageFeedCacheAfterProductChange(
        "product.delete.missing",
        id,
      )
      await invalidateSearchSuggestionsAfterProductChange(
        "product.delete.missing",
        id,
      )
      await invalidateProductAnalyticsAfterProductChange(
        "product.delete.missing",
        id,
      )
      return { error: "Product not found" }
    }
    console.error("Error deleting product:", error)
    return { error: "Failed to delete product" }
  }
}

export async function verifyProductDomainAction(productId: string) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { error: "Unauthenticated" }
  const currentUser = await getActiveUserByClerkId(clerkId)
  if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      verification: true,
    },
  })

  if (product && product.userId !== currentUser.id) {
    return { error: "Only the owner can verify this product." }
  }

  if (!product || !product.verification || !product.websiteUrl) {
    return { error: "Invalid product or missing verification info." }
  }

  try {
    const domain = getRootDomain(product.websiteUrl)
    if (!domain) {
      return { error: "Unable to derive root domain for verification." }
    }

    const txtRecords = await resolveTxtRecords(domain)
    const flattened = txtRecords.flat()
    const expected = product.verification.verificationTxt

    const matched = flattened.some((txt) => txt.trim() === expected.trim())

    await prisma.productVerification.update({
      where: { productId },
      data: {
        isVerified: matched,
        verifiedAt: matched ? new Date() : null,
      },
    })

    return matched
      ? { success: true }
      : { error: "Verification TXT record not found in DNS." }
  } catch (error: unknown) {
    console.error("DNS verification failed:", error)
    await prisma.productVerification.update({
      where: { productId },
      data: {
        isVerified: false,
        verifiedAt: null,
      },
    })

    const code = (error as { code?: string })?.code ?? "UNKNOWN"
    return { error: `DNS check failed: ${code}` }
  }
}

export async function checkDomainTxtAction(websiteUrl: string) {
  // Stateless DNS check for add-flow verification
  if (!websiteUrl) return { error: "Missing website URL" }
  try {
    const domain = getRootDomain(websiteUrl)
    if (!domain)
      return { error: "Unable to derive root domain for verification." }

    const txtRecords = await resolveTxtRecords(domain)
    const flattened = txtRecords.flat().map((t) => t.trim())
    const expected = generateVerificationTxtFromWebsite(websiteUrl)
    const matched = flattened.some((txt) => txt === expected.trim())
    return { success: matched, expected }
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? "UNKNOWN"
    return { error: `DNS check failed: ${code}` }
  }
}
