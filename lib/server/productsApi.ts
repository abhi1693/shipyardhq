import { z } from "zod"

import prisma from "@/lib/prisma"
import { getAppBaseUrl } from "@/lib/app-url"
import { productPath } from "@/lib/routes"

const cursorSchema = z.object({
  version: z.literal(1),
  planId: z.string().min(1),
  createdAt: z.iso.datetime(),
  id: z.string().min(1),
})

type ProductsCursor = z.infer<typeof cursorSchema>

export class InvalidProductsPaginationError extends Error {}

export function parseProductsPagination(
  searchParams: URLSearchParams,
  planId: string,
) {
  const rawLimit = searchParams.get("limit") ?? "20"
  if (
    searchParams.getAll("limit").length > 1 ||
    searchParams.getAll("cursor").length > 1 ||
    !/^(?:[1-9]\d?|100)$/.test(rawLimit)
  ) {
    throw new InvalidProductsPaginationError("Invalid pagination")
  }

  const rawCursor = searchParams.get("cursor")
  let cursor: ProductsCursor | undefined
  if (rawCursor !== null) {
    try {
      if (rawCursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(rawCursor)) {
        throw new Error("Invalid cursor encoding")
      }
      cursor = cursorSchema.parse(
        JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8")),
      )
      if (cursor.planId !== planId) throw new Error("Cursor plan mismatch")
    } catch {
      throw new InvalidProductsPaginationError("Invalid cursor")
    }
  }

  return { limit: Number(rawLimit), cursor }
}

export async function listProductsForApi({
  planId,
  limit,
  cursor,
}: {
  planId: string
  limit: number
  cursor?: ProductsCursor
}) {
  // Use value-based pagination so deleting or reassigning the boundary product
  // does not invalidate the next page. The id breaks ties in creation time.
  const rows = await prisma.product.findMany({
    where: {
      status: "published",
      planId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      description: true,
      websiteUrl: true,
      logo: true,
      pricingModel: true,
      startingPriceCents: true,
      currencyCode: true,
      createdAt: true,
      plan: { select: { id: true, slug: true, name: true } },
    },
  })

  const hasMore = rows.length > limit
  const products = rows.slice(0, limit)
  const lastProduct = products.at(-1)
  const nextCursor =
    hasMore && lastProduct
      ? Buffer.from(
          JSON.stringify({
            version: 1,
            planId,
            createdAt: lastProduct.createdAt.toISOString(),
            id: lastProduct.id,
          } satisfies ProductsCursor),
        ).toString("base64url")
      : null
  const baseUrl = getAppBaseUrl()
  const nextUrl = nextCursor ? new URL("/api/products", baseUrl) : null
  if (nextUrl && nextCursor) {
    nextUrl.searchParams.set("limit", String(limit))
    nextUrl.searchParams.set("cursor", nextCursor)
  }

  return {
    items: products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      url: new URL(productPath(product.slug), baseUrl).href,
      productUrl: product.websiteUrl,
      tagline: product.tagline,
      description: product.description,
      logo: product.logo,
      pricing: {
        model: product.pricingModel,
        startingPriceCents: product.startingPriceCents,
        currencyCode: product.currencyCode,
      },
      plan: product.plan,
    })),
    limit,
    hasMore,
    nextCursor,
    nextUrl: nextUrl?.href ?? null,
  }
}
