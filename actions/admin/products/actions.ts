"use server"

import { Resolver } from "node:dns/promises"
import { createHash } from "crypto"
import prisma from "@/lib/prisma"
import { ProductType, PricingModel, Prisma } from "@prisma/client"
import { slugify } from "@/lib/utils"

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

  const startingPriceCentsRaw = formData.get("startingPriceCents")?.toString()
  const startingPriceCents = startingPriceCentsRaw
    ? Number(startingPriceCentsRaw)
    : undefined
  const currencyCode =
    formData.get("currencyCode")?.toString().trim() || undefined
  const ctaLabel = formData.get("ctaLabel")?.toString().trim() || undefined
  const ctaUrl = formData.get("ctaUrl")?.toString().trim() || undefined
  const bannerImage =
    formData.get("bannerImage")?.toString().trim() || undefined
  const companyName =
    formData.get("companyName")?.toString().trim() || undefined

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

    await prisma.product.create({
      data: {
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
        companyName,
        keywords,
        platforms: (platforms as any) ?? undefined,
        metadata: {
          create: {
            githubUrl,
            twitterUrl,
            demoUrl,
            contactEmail,
          },
        },
        analytics: {
          create: {},
        },
        verification: {
          create: {
            verificationTxt,
          },
        },
      },
    })

    return { success: true }
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
    companyName?: string | null
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
  },
) {
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

  if (websiteUrl) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { verification: true },
    })
    if (product && product.websiteUrl !== websiteUrl) {
      await prisma.productVerification.update({
        where: { productId: id },
        data: {
          isVerified: false,
          verifiedAt: null,
        },
      })
    }
  }

  try {
    return await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        categoryId,
        userId,
        tagline: tagline?.trim(),
        description: description?.trim(),
        websiteUrl: websiteUrl?.trim(),
        logo: logo?.trim(),
        type,
        pricingModel,
        metadata: {
          update: {
            githubUrl: githubUrl?.trim() || null,
            twitterUrl: twitterUrl?.trim() || null,
            demoUrl: demoUrl?.trim() || null,
            contactEmail: contactEmail?.trim() || null,
          },
        },
        organizationId: data.organizationId || null,
        slug: data.slug || undefined,
        status: (data.status as any) || undefined,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        startingPriceCents: data.startingPriceCents ?? undefined,
        currencyCode: data.currencyCode ?? undefined,
        ctaLabel: data.ctaLabel ?? undefined,
        ctaUrl: data.ctaUrl ?? undefined,
        bannerImage: data.bannerImage ?? undefined,
        companyName: data.companyName ?? undefined,
        keywords: data.keywords as any,
        platforms: data.platforms as any,
      },
    })
  } catch (error) {
    console.error("Error updating product:", error)
    return { error: "Failed to update product" }
  }
}

export async function deleteProductAction(id: string) {
  try {
    return await prisma.product.delete({
      where: { id },
    })
  } catch (error) {
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
