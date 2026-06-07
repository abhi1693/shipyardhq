"use server"

import { Resolver } from "node:dns/promises"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { dispatchEventAsync } from "@/lib/server/events"
import "@/lib/server/badges" // register badge listeners
import { deleteBlob, deleteBlobPrefix, isManagedBlobUrl } from "@/lib/blob"
import "@/lib/server/plans" // register default-plan listeners
import "@/lib/server/rewards/listeners"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import {
  FeatureEntitlementStatus,
  Prisma,
  PricingModel,
  ProductType,
} from "@/lib/vendor/prisma/client"
import { slugify } from "@/lib/utils"
import { checkRole } from "@/lib/roles"
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
import { refreshHomepageFeedCache } from "@/actions/public/homepage/feed"
import { invalidateSearchSuggestionsCache } from "@/lib/server/search/suggestions-cache"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"

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

export async function getProducts(args: Prisma.ProductFindManyArgs = {}) {
  try {
    const query: Prisma.ProductFindManyArgs = {
      orderBy: { createdAt: "desc" },
      ...(args.select ? {} : { include: { category: true, user: true } }),
      ...args,
    }

    return await prisma.product.findMany(query)
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}

export async function getProductsCount(args: Prisma.ProductCountArgs = {}) {
  try {
    return await prisma.product.count(args)
  } catch (error) {
    console.error("Error counting products:", error)
    throw new Error("Failed to count products")
  }
}

export async function getProductById(id: string) {
  try {
    let product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
        metadata: true,
        analytics: true,
        verification: true,
        ProductMedia: true,
        ProductBadge: true,
        featureEntitlements: {
          where: {
            status: {
              in: [
                FeatureEntitlementStatus.active,
                FeatureEntitlementStatus.pending,
              ],
            },
          },
          select: { featureKey: true, status: true },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            boostForDays: true,
            isDefault: true,
            assignments: {
              include: {
                feature: true,
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
    if (product && !product.plan) {
      const defaultPlan = await getDefaultPlanWithFeatures()
      if (defaultPlan) {
        product = { ...product, plan: defaultPlan }
      }
    }
    return product
  } catch (error) {
    console.error("Error fetching product by ID:", error)
    throw new Error("Failed to fetch product")
  }
}

export async function getProductForEditWizard(id: string) {
  try {
    return await prisma.product.findUnique({
      where: { id },
      select: productForEditWizardSelect,
    })
  } catch (error) {
    console.error("Error fetching product for wizard:", error)
    throw new Error("Failed to fetch product")
  }
}

export async function createProductAction(formData: FormData) {
  const providedId = formData.get("id")?.toString().trim()
  const name = formData.get("name")!.toString().trim()
  const tagline = formData.get("tagline")!.toString().trim()
  const description = formData.get("description")!.toString().trim()
  const websiteUrl = formData.get("websiteUrl")!.toString().trim()
  const logo = formData.get("logo")!.toString().trim()
  const categoryId = formData.get("categoryId")!.toString()
  const userId = formData.get("userId")!.toString()
  const slug = formData.get("slug")?.toString().trim()
  const status = formData.get("status")?.toString().trim() as
    | "draft"
    | "published"
    | "archived"
    | undefined
  const publishedAtRaw = formData.get("publishedAt")?.toString().trim()
  const publishedAt =
    status === "published"
      ? new Date()
      : publishedAtRaw
        ? new Date(publishedAtRaw)
        : null
  const type =
    ProductType[formData.get("type")!.toString() as keyof typeof ProductType]
  const pricingModel =
    PricingModel[
      formData.get("pricingModel")!.toString() as keyof typeof PricingModel
    ]

  const githubUrl = formData.get("githubUrl")?.toString().trim()
  const twitterUrl = formData.get("twitterUrl")?.toString().trim()
  const demoUrl = formData.get("demoUrl")?.toString().trim()
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
  try {
    const kw = formData.get("keywords")?.toString()
    if (kw) keywords = JSON.parse(kw)
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
        const resolver = new Resolver()
        resolver.setServers(["1.1.1.1", "8.8.8.8"])
        const txtRecords = await resolver.resolveTxt(domain)
        const flattened = txtRecords.flat().map((t) => t.trim())
        initialVerified = flattened.some(
          (txt) => txt === verificationTxt.trim(),
        )
      }
    } catch {
      // Ignore DNS errors during creation; user can verify later
    }

    const uniqueAlternativeIds = Array.from(new Set(alternativeIds))
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
        categoryId,
        userId,
        type,
        pricingModel,
        status: status ?? "published",
        publishedAt:
          (status === "published" ? new Date() : null) ?? publishedAt ?? null,
        startingPriceCents,
        currencyCode,
        bannerImage,
        keywords,
        platforms: (platforms as any) ?? undefined,
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
            demoUrl,
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
      Promise.resolve().then(() => revalidateCategory(categoryId)),
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

    if (created.status === "published") {
      dispatchEventAsync(
        "product.published",
        { productId: created.id },
        { context: { productId: created.id } },
      )
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
    userId: string
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
    demoUrl?: string | null
    contactEmail?: string | null
    utmCampaign?: string | null
    planId?: string | null
    alternativeIds?: string[]
  },
) {
  // Determine role for permission-sensitive updates
  const isAdmin = await checkRole("admin")
  let currentUser: Awaited<ReturnType<typeof getActiveUserByClerkId>> | null =
    null
  if (!isAdmin) {
    const { userId: clerkId } = await auth()
    if (!clerkId) return { error: "Unauthenticated" }
    currentUser = await getActiveUserByClerkId(clerkId)
    if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }
  }

  const {
    name,
    categoryId,
    userId,
    description,
    demoUrl,
    contactEmail,
    githubUrl,
    twitterUrl,
    websiteUrl,
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
      plan: { select: { boostForDays: true, isDefault: true } },
      alternatives: { select: { id: true } },
    },
  })

  if (!current) {
    return { error: "Product not found" }
  }

  if (!isAdmin && currentUser) {
    const ownsProduct = current.userId === currentUser.id
    if (!ownsProduct) {
      return { error: "Not authorized to edit this product" }
    }
  }

  // Guard: members cannot change website URL or slug once created
  if (!isAdmin) {
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

    const nextStatus = data.status
    if (nextStatus && nextStatus !== current.status) {
      const isFreePlan = !current.plan || current.plan.isDefault
      const boostAssignedAt = current.planAssignedAt
      const boostDays = current.plan?.boostForDays ?? 0
      const boostExpired =
        !isFreePlan &&
        boostAssignedAt &&
        boostDays > 0 &&
        boostAssignedAt.getTime() + boostDays * 24 * 60 * 60 * 1000 <=
          Date.now()

      if (!isFreePlan && !boostExpired) {
        return { error: "Status locked while boosted." }
      }
    }
  }

  // If admin is changing website, reset verification expectations
  if (isAdmin && websiteUrl && current.websiteUrl !== websiteUrl) {
    const newVerificationTxt = generateVerificationTxtFromWebsite(websiteUrl)
    await prisma.productVerification.update({
      where: { productId: id },
      data: {
        verificationTxt: newVerificationTxt,
        isVerified: false,
        verifiedAt: null,
      },
    })
  }

  try {
    const prev = await prisma.product.findUnique({
      where: { id },
      select: { logo: true, bannerImage: true },
    })

    let planUpdate: { planId?: string | null; planAssignedAt?: Date | null } =
      {}
    if (data.planId !== undefined) {
      if (data.planId) {
        const plan = await prisma.plan.findUnique({
          where: { id: data.planId },
          select: { boostForDays: true, isDefault: true },
        })
        if (!plan) return { error: "Plan not found" }
        planUpdate = {
          planId: data.planId,
          planAssignedAt: resolvePlanAssignedAt({
            currentPlan: current.plan,
            currentAssignedAt: current.planAssignedAt,
            newPlan: plan,
          }),
        }
      } else {
        planUpdate = { planId: null, planAssignedAt: null }
      }
    }

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

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        categoryId,
        userId,
        tagline: tagline?.trim(),
        description: description?.trim(),
        // Only admins may change websiteUrl (guarded above); members keep current value
        websiteUrl: isAdmin ? websiteUrl?.trim() : undefined,
        logo: logo?.trim(),
        type,
        pricingModel,
        metadata: {
          update: {
            githubUrl: githubUrl?.trim() || null,
            twitterUrl: twitterUrl?.trim() || null,
            demoUrl: demoUrl?.trim() || null,
            contactEmail: contactEmail?.trim() || null,
            utmCampaign: (data.utmCampaign || undefined) ?? undefined,
          },
        },
        // Only admins may change slug (guarded above)
        slug: isAdmin ? data.slug || undefined : undefined,
        status: (data.status as any) || undefined,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
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
        ...planUpdate,
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
    revalidateCategory(categoryId)
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
    const isAdmin = await checkRole("admin")
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

    if (!isAdmin) {
      const { userId: clerkId } = await auth()
      if (!clerkId) return { error: "Unauthenticated" }
      const currentUser = await getActiveUserByClerkId(clerkId)
      if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }
      if (product.userId !== currentUser.id) {
        return { error: "Only the owner can delete this product" }
      }
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
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      verification: true,
    },
  })

  if (!product || !product.verification || !product.websiteUrl) {
    return { error: "Invalid product or missing verification info." }
  }

  try {
    const domain = getRootDomain(product.websiteUrl)
    if (!domain) {
      return { error: "Unable to derive root domain for verification." }
    }

    const resolver = new Resolver()
    resolver.setServers(["1.1.1.1", "8.8.8.8"])

    const txtRecords = await resolver.resolveTxt(domain)
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

    const resolver = new Resolver()
    resolver.setServers(["1.1.1.1", "8.8.8.8"])

    const txtRecords = await resolver.resolveTxt(domain)
    const flattened = txtRecords.flat().map((t) => t.trim())
    const expected = generateVerificationTxtFromWebsite(websiteUrl)
    const matched = flattened.some((txt) => txt === expected.trim())
    return { success: matched, expected }
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? "UNKNOWN"
    return { error: `DNS check failed: ${code}` }
  }
}

// Assign or clear a plan for a product (admin only)
export async function assignProductPlanAction(
  productId: string,
  planId: string | null,
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        planAssignedAt: true,
        plan: { select: { boostForDays: true, isDefault: true } },
      },
    })
    if (!product) return { error: "Product not found" }

    let planAssignedAt: Date | null = null
    if (planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        select: { boostForDays: true, isDefault: true },
      })
      if (!plan) return { error: "Plan not found" }
      planAssignedAt = resolvePlanAssignedAt({
        currentPlan: product.plan,
        currentAssignedAt: product.planAssignedAt,
        newPlan: plan,
      })
    }
    await prisma.product.update({
      where: { id: productId },
      data: { planId: planId || null, planAssignedAt },
      select: { id: true, planId: true },
    })
    await refreshHomepageFeedCacheAfterProductChange(
      "product.plan.assigned",
      productId,
    )
    await invalidateProductAnalyticsAfterProductChange(
      "product.plan.assigned",
      productId,
    )
    return { success: true }
  } catch (e) {
    console.error("Failed to assign plan to product", e)
    return { error: "Failed to assign plan" }
  }
}

// Update status only (draft/published/archived)
export async function setProductStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
) {
  try {
    const isAdmin = await checkRole("admin")
    let currentUser: Awaited<ReturnType<typeof getActiveUserByClerkId>> | null =
      null
    if (!isAdmin) {
      const { userId: clerkId } = await auth()
      if (!clerkId) return { error: "Unauthenticated" }
      currentUser = await getActiveUserByClerkId(clerkId)
      if (!currentUser) return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    const previous = await prisma.product.findUnique({
      where: { id },
      select: {
        status: true,
        userId: true,
        planAssignedAt: true,
        plan: { select: { isDefault: true, boostForDays: true } },
      },
    })
    if (!previous) return { error: "Product not found" }

    if (!isAdmin && currentUser) {
      const ownsProduct = previous.userId === currentUser.id
      if (!ownsProduct) {
        return { error: "Not authorized to update status" }
      }
    }

    const isFreePlan = !previous.plan || previous.plan.isDefault
    const boostAssignedAt = previous.planAssignedAt
    const boostDays = previous.plan?.boostForDays ?? 0
    const boostExpired =
      !isFreePlan &&
      boostAssignedAt &&
      boostDays > 0 &&
      boostAssignedAt.getTime() + boostDays * 24 * 60 * 60 * 1000 <= Date.now()

    if (!isAdmin && !isFreePlan && !boostExpired) {
      return { error: "Status locked while boosted." }
    }

    const result = await prisma.product.update({
      where: { id },
      data: {
        status,
        publishedAt: status === "published" ? new Date() : null,
      },
      select: { id: true, status: true, slug: true },
    })

    if (status === "published" && previous.status !== "published") {
      dispatchEventAsync(
        "product.published",
        { productId: id },
        { context: { productId: id } },
      )
    }
    revalidateProduct(id, "revalidate")
    await refreshHomepageFeedCacheAfterProductChange(
      "product.status.updated",
      id,
    )
    await invalidateSearchSuggestionsAfterProductChange(
      "product.status.updated",
      id,
    )
    await invalidateProductAnalyticsAfterProductChange(
      "product.status.updated",
      id,
    )

    return result
  } catch (error) {
    console.error("Error updating product status:", error)
    return { error: "Failed to update status" }
  }
}
