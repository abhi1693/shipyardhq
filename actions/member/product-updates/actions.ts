"use server"

import prisma from "@/lib/prisma"
import { ProductUpdateStatus, Prisma } from "@/lib/vendor/prisma/client"
import { productUpdateInputSchema } from "@/lib/productUpdates/schema"
import {
  requireManageableProduct,
  type ManageableProductSummary,
} from "@/lib/server/productAccess"
import {
  revalidateProductUpdate,
  revalidateProductUpdates,
} from "@/lib/cache/revalidate"
import type { ProductUpdateManageView } from "@/types/product-updates"
import { dispatchEventAsync } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"

const manageableUpdateSelect = {
  id: true,
  title: true,
  summary: true,
  content: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const

type ManageableProductUpdate = Prisma.ProductUpdateGetPayload<{
  select: typeof manageableUpdateSelect
}>

function formatManageableUpdate(
  update: ManageableProductUpdate,
): ProductUpdateManageView {
  const { author, ...rest } = update
  const authorName =
    author && (author.firstName || author.lastName)
      ? [author.firstName ?? "", author.lastName ?? ""].join(" ").trim()
      : null

  return {
    ...rest,
    summary: rest.summary ?? null,
    status: rest.status as ProductUpdateStatus,
    publishedAt: rest.publishedAt ? rest.publishedAt.toISOString() : null,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    author: author
      ? {
          id: author.id,
          firstName: author.firstName,
          lastName: author.lastName,
          displayName: authorName || null,
        }
      : null,
  }
}

type DispatchPublishedEventInput = {
  product: ManageableProductSummary
  update: ManageableProductUpdate
}

function dispatchProductUpdatePublishedEvent({
  product,
  update,
}: DispatchPublishedEventInput) {
  const publishedAt = update.publishedAt ?? new Date()

  dispatchEventAsync(
    APP_EVENTS.PRODUCT_UPDATE_PUBLISHED,
    {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productOwnerId: product.userId,
      updateId: update.id,
      updateTitle: update.title,
      updateSummary: update.summary ?? null,
      updatePublishedAt: publishedAt,
      authorId: update.author?.id ?? null,
    },
    {
      context: {
        productId: product.id,
        productUpdateId: update.id,
      },
    },
  )
}

function extractFirstIssueMessage(error: any) {
  if (error?.issues?.length) {
    return error.issues[0]?.message ?? null
  }
  return null
}

export async function getProductUpdatesForManage(
  slug: string,
): Promise<ProductUpdateManageView[]> {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const updates = await prisma.productUpdate.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: "desc" },
    select: manageableUpdateSelect,
  })

  return updates.map(formatManageableUpdate)
}

export async function createProductUpdateAction(slug: string, input: unknown) {
  const { product, currentUser } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const parsed = productUpdateInputSchema.safeParse(input)
  if (!parsed.success) {
    const message = extractFirstIssueMessage(parsed.error)
    return {
      error:
        message ??
        "We couldn't save this update. Please double-check the details and try again.",
    }
  }

  const data = parsed.data
  const status = data.status as ProductUpdateStatus
  const title = data.title.trim()
  const summary =
    data.summary && data.summary.trim().length ? data.summary.trim() : null
  const content = data.content.trim()
  const publishedAt = status === "published" ? new Date() : null

  try {
    const created = await prisma.productUpdate.create({
      data: {
        productId: product.id,
        authorId: currentUser.id,
        title,
        summary,
        content,
        status,
        publishedAt,
      },
      select: manageableUpdateSelect,
    })

    revalidateProductUpdates(product.slug)
    revalidateProductUpdate(created.id, product.slug)

    if (status === ProductUpdateStatus.published) {
      dispatchProductUpdatePublishedEvent({
        product,
        update: created,
      })
    }

    return {
      success: true as const,
      update: formatManageableUpdate(created),
    }
  } catch (error) {
    console.error("[product-updates] createProductUpdateAction failed", error)
    return {
      error: "Something went wrong while saving this update. Please try again.",
    }
  }
}

export async function updateProductUpdateAction(
  slug: string,
  updateId: string,
  input: unknown,
) {
  const { product, currentUser } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  const existing = await prisma.productUpdate.findFirst({
    where: { id: updateId, productId: product.id },
    select: { id: true, status: true, publishedAt: true },
  })

  if (!existing) {
    return { error: "Update not found." }
  }

  const parsed = productUpdateInputSchema.safeParse(input)
  if (!parsed.success) {
    const message = extractFirstIssueMessage(parsed.error)
    return {
      error:
        message ??
        "We couldn't save this update. Please double-check the details and try again.",
    }
  }

  const data = parsed.data
  const status = data.status as ProductUpdateStatus
  const title = data.title.trim()
  const summary =
    data.summary && data.summary.trim().length ? data.summary.trim() : null
  const content = data.content.trim()
  const shouldSetPublishedAt = status === "published" && !existing.publishedAt
  const publishedAt =
    status === "published"
      ? shouldSetPublishedAt
        ? new Date()
        : (existing.publishedAt ?? new Date())
      : null

  try {
    const updated = await prisma.productUpdate.update({
      where: { id: updateId },
      data: {
        title,
        summary,
        content,
        status,
        publishedAt,
        authorId: currentUser.id,
      },
      select: manageableUpdateSelect,
    })

    revalidateProductUpdates(product.slug)
    revalidateProductUpdate(updated.id, product.slug)

    if (
      status === ProductUpdateStatus.published &&
      existing.status !== ProductUpdateStatus.published
    ) {
      dispatchProductUpdatePublishedEvent({
        product,
        update: updated,
      })
    }

    return {
      success: true as const,
      update: formatManageableUpdate(updated),
    }
  } catch (error) {
    console.error("[product-updates] updateProductUpdateAction failed", error)
    return {
      error: "Something went wrong while saving this update. Please try again.",
    }
  }
}

export async function deleteProductUpdateAction(
  slug: string,
  updateId: string,
) {
  const { product } = await requireManageableProduct(slug, {
    unauthorizedRedirect: null,
    missingRedirect: null,
  })

  try {
    const existing = await prisma.productUpdate.findFirst({
      where: { id: updateId, productId: product.id },
      select: { id: true },
    })

    if (!existing) {
      return { error: "Update not found." }
    }

    await prisma.productUpdate.delete({
      where: { id: updateId },
    })

    revalidateProductUpdates(product.slug)
    revalidateProductUpdate(updateId, product.slug)

    return { success: true as const }
  } catch (error) {
    console.error("[product-updates] deleteProductUpdateAction failed", error)
    return {
      error:
        "We couldn't remove this update right now. Please try again shortly.",
    }
  }
}
