"use server"

import { Resolver } from "node:dns/promises"
import prisma from "@/lib/prisma"
import { ProductType, PricingModel, Prisma } from "@prisma/client"

function generateVerificationTxt(): string {
  return `prod-verif-shipyard-${Math.random().toString(36).slice(2, 10)}`
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
        metadata: true,
        analytics: true,
        verification: true,
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

  try {
    await prisma.product.create({
      data: {
        name,
        tagline,
        description,
        websiteUrl,
        logo,
        categoryId,
        userId,
        type,
        pricingModel,
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
            verificationTxt: generateVerificationTxt(),
          },
        },
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error creating product:", error)
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
