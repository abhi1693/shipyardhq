"use server"

import { Resolver } from "node:dns/promises"
import { createHash } from "crypto"
import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import { publish } from "@/lib/server/events"
import "@/lib/server/badges" // register badge listeners
import { deleteBlob, deleteBlobPrefix } from "@/lib/blob"
import "@/lib/server/plans" // register default-plan listeners
import "@/lib/server/email/productVerificationReminder"
import "@/lib/server/productInsights/initialPipeline"
import "@/lib/server/social/twitterBot"
import { sendProductPublishedEmail } from "@/lib/server/email/productPublished"
import { resolvePlanAssignedAt } from "@/lib/server/planAssignment"
import { ProductType, PricingModel, Prisma } from "@/lib/vendor/prisma/client"
import { slugify } from "@/lib/utils"
import { checkRole } from "@/lib/roles"
import { memberHasFeature } from "@/lib/memberFeatures"
import {
  revalidateCategory,
  revalidateCategories,
  revalidateLeaderboard,
  revalidateProduct,
  revalidateProducts,
} from "@/lib/cache/revalidate"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

function generateVerificationTxtFromWebsite(websiteUrl: string): string {
  const norm = websiteUrl.trim().toLowerCase()
  const hash = createHash("sha256").update(norm).digest("hex").slice(0, 12)
  return `prod-verif-shipyard-${hash}`
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
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
        organization: true,
        metadata: true,
        analytics: true,
        verification: true,
        ProductMedia: true,
        ProductBadge: true,
        plan: {
          include: {
            assignments: {
              include: {
                feature: true,
              },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error("Error fetching product by ID:", error)
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
  const organizationId = formData.get("organizationId")?.toString() || undefined
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
  let ctaLabel = formData.get("ctaLabel")?.toString().trim() || undefined
  let ctaUrl = formData.get("ctaUrl")?.toString().trim() || undefined
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
      const url = new URL(websiteUrl)
      const domain = url.hostname
      const resolver = new Resolver()
      resolver.setServers(["1.1.1.1", "8.8.8.8"])
      const txtRecords = await resolver.resolveTxt(domain)
      const flattened = txtRecords.flat().map((t) => t.trim())
      initialVerified = flattened.some((txt) => txt === verificationTxt.trim())
    } catch {
      // Ignore DNS errors during creation; user can verify later
    }

    // Gate CTA fields by feature for non-admins
    const isAdmin = await checkRole("admin")
    const canEditCTA = isAdmin || (await memberHasFeature("customCTA"))
    if (!canEditCTA) {
      ctaLabel = undefined
      ctaUrl = undefined
    }

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
        organizationId:
          organizationId && organizationId.length ? organizationId : undefined,
        type,
        pricingModel,
        status: status ?? "published",
        publishedAt:
          (status === "published" ? new Date() : null) ?? publishedAt ?? null,
        startingPriceCents,
        currencyCode,
        ctaLabel,
        ctaUrl,
        bannerImage,
        keywords,
        platforms: (platforms as any) ?? undefined,
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
      },
    })
    const sideEffects: Promise<unknown>[] = [
      // Fire domain event for listeners (e.g., auto badges)
      publish("product.created", { productId: created.id }),
      // Invalidate public caches affected by a new product
      Promise.resolve().then(() => revalidateProducts()),
      Promise.resolve().then(() => revalidateCategory(categoryId)),
      Promise.resolve().then(() => revalidateLeaderboard()),
    ]

    if (created.status === "published") {
      sideEffects.push(publish("product.published", { productId: created.id }))
      sideEffects.push(sendProductPublishedEmail(created.id))
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
    return { error: "Failed to create product" }
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
    organizationId?: string | null
    slug?: string
    status?: "draft" | "published" | "archived"
    publishedAt?: string | null
    startingPriceCents?: number | null
    currencyCode?: string | null
    ctaLabel?: string | null
    ctaUrl?: string | null
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
    },
  })

  if (!current) {
    return { error: "Product not found" }
  }

  if (!isAdmin && currentUser) {
    const ownsProduct = current.userId === currentUser.id
    let belongsToOrg = false
    if (!ownsProduct && current.organizationId) {
      const membership = await prisma.organizationMembership.findFirst({
        where: {
          organizationId: current.organizationId,
          userId: currentUser.id,
        },
        select: { id: true },
      })
      belongsToOrg = Boolean(membership)
    }
    if (!ownsProduct && !belongsToOrg) {
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

    // Gate CTA fields by feature for non-admins: ignore incoming changes if not allowed
    const canEditCTA = isAdmin || (await memberHasFeature("customCTA"))

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
        organizationId: data.organizationId || null,
        // Only admins may change slug (guarded above)
        slug: isAdmin ? data.slug || undefined : undefined,
        status: (data.status as any) || undefined,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        startingPriceCents: data.startingPriceCents ?? undefined,
        currencyCode: data.currencyCode ?? undefined,
        ctaLabel: canEditCTA ? (data.ctaLabel ?? undefined) : undefined,
        ctaUrl: canEditCTA ? (data.ctaUrl ?? undefined) : undefined,
        bannerImage: data.bannerImage ?? undefined,
        keywords: data.keywords as any,
        platforms: data.platforms as any,
        ...planUpdate,
      },
    })

    // Fire update event (available for future listeners)
    await publish("product.updated", { productId: id })

    // Cleanup old blobs if logo/banner changed and were hosted on Vercel Blob
    const isVercelBlobUrl = (u?: string | null) => {
      if (!u) return false
      try {
        const host = new URL(u).hostname
        return host.includes("vercel-storage.com")
      } catch {
        return false
      }
    }

    const deletions: Promise<any>[] = []
    if (
      prev?.logo &&
      prev.logo !== updated.logo &&
      isVercelBlobUrl(prev.logo)
    ) {
      deletions.push(deleteBlob(prev.logo).catch(() => {}))
    }
    if (
      prev?.bannerImage &&
      prev.bannerImage !== updated.bannerImage &&
      isVercelBlobUrl(prev.bannerImage)
    ) {
      deletions.push(deleteBlob(prev.bannerImage).catch(() => {}))
    }
    if (deletions.length) await Promise.all(deletions)

    // Invalidate caches for updated product
    if (typeof id === "string" && id) revalidateProduct(id)
    revalidateCategory(categoryId)
    revalidateLeaderboard()

    if (updated.status === "published" && current.status !== "published") {
      await Promise.all([
        sendProductPublishedEmail(updated.id),
        publish("product.published", { productId: updated.id }),
      ])
    }

    return updated
  } catch (error) {
    console.error("Error updating product:", error)
    return { error: "Failed to update product" }
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
        organizationId: true,
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
    await publish("product.deleted", { productId: id })
    // Invalidate public caches heavily, product removed
    revalidateProducts()
    revalidateCategories()
    revalidateLeaderboard()
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
    const url = new URL(product.websiteUrl)
    const domain = url.hostname

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
    const url = new URL(websiteUrl)
    const domain = url.hostname

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
      select: { status: true, userId: true, organizationId: true },
    })
    if (!previous) return { error: "Product not found" }

    if (!isAdmin && currentUser) {
      const ownsProduct = previous.userId === currentUser.id
      let belongsToOrg = false
      if (!ownsProduct && previous.organizationId) {
        const membership = await prisma.organizationMembership.findFirst({
          where: {
            organizationId: previous.organizationId,
            userId: currentUser.id,
          },
          select: { id: true },
        })
        belongsToOrg = Boolean(membership)
      }
      if (!ownsProduct && !belongsToOrg) {
        return { error: "Not authorized to update status" }
      }
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
      await Promise.all([
        sendProductPublishedEmail(id),
        publish("product.published", { productId: id }),
      ])
    }

    return result
  } catch (error) {
    console.error("Error updating product status:", error)
    return { error: "Failed to update status" }
  }
}

// Duplicate an existing product into a new draft
export async function duplicateProductAction(id: string) {
  try {
    const src = await prisma.product.findUnique({
      where: { id },
      include: { metadata: true, verification: true },
    })
    if (!src) return { error: "Product not found" }

    const newName = `${src.name} Copy`
    const newSlug = await generateUniqueSlug(newName)
    const verificationTxt = generateVerificationTxtFromWebsite(src.websiteUrl)

    const created = await prisma.product.create({
      data: {
        name: newName,
        slug: newSlug,
        tagline: src.tagline,
        description: src.description,
        websiteUrl: src.websiteUrl,
        logo: src.logo,
        categoryId: src.categoryId,
        userId: src.userId,
        organizationId: src.organizationId,
        type: src.type,
        pricingModel: src.pricingModel,
        status: "draft",
        publishedAt: null,
        startingPriceCents: src.startingPriceCents,
        currencyCode: src.currencyCode,
        ctaLabel: src.ctaLabel,
        ctaUrl: src.ctaUrl,
        bannerImage: src.bannerImage,
        keywords: src.keywords,
        platforms: src.platforms,
        metadata: src.metadata
          ? {
              create: {
                githubUrl: src.metadata.githubUrl,
                twitterUrl: src.metadata.twitterUrl,
                demoUrl: src.metadata.demoUrl,
                contactEmail: src.metadata.contactEmail,
              },
            }
          : undefined,
        analytics: { create: {} },
        verification: {
          create: { verificationTxt, isVerified: false, verifiedAt: null },
        },
      },
      select: { id: true, slug: true },
    })
    return { success: true, id: created.id, slug: created.slug }
  } catch (error) {
    console.error("Error duplicating product:", error)
    return { error: "Failed to duplicate product" }
  }
}
