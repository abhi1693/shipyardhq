"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"

import { refreshHomepageFeedCache } from "@/lib/server/homepage/feed"
import { deleteBlobPrefix } from "@/lib/blob"
import {
  revalidateCategories,
  revalidateLeaderboard,
  revalidateProducts,
  revalidateUsers,
} from "@/lib/cache/revalidate"
import prisma from "@/lib/prisma"
import { invalidateProductAnalyticsRecordCache } from "@/lib/server/analytics/productAnalytics"
import { dispatchEventAsync } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { invalidateSearchSuggestionsCache } from "@/lib/server/search/suggestions-cache"
import { invalidateActiveUserCache } from "@/lib/server/userStatus"

async function cleanupProductBlobs(clerkId: string, productIds: string[]) {
  await Promise.allSettled(
    productIds.map((productId) =>
      deleteBlobPrefix(`${clerkId}/products/${productId}/`),
    ),
  )
}

async function refreshDeletedAccountCaches(productIds: string[]) {
  revalidateUsers()

  if (!productIds.length) {
    return
  }

  revalidateProducts()
  revalidateCategories()
  revalidateLeaderboard()

  productIds.forEach((productId) => {
    dispatchEventAsync(
      APP_EVENTS.PRODUCT_DELETED,
      { productId },
      { context: { productId } },
    )
  })

  await Promise.allSettled([
    refreshHomepageFeedCache(),
    invalidateSearchSuggestionsCache("account.deleted"),
    ...productIds.map((productId) =>
      invalidateProductAnalyticsRecordCache(productId, "account.deleted"),
    ),
  ])
}

export async function deleteCurrentMemberAccountAction() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    return { error: "Not authenticated" }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        products: {
          select: {
            id: true,
          },
        },
      },
    })

    const productIds = user?.products.map((product) => product.id) ?? []

    if (user) {
      await cleanupProductBlobs(clerkId, productIds)

      await prisma.$transaction(async (tx) => {
        await tx.product.deleteMany({
          where: {
            userId: user.id,
          },
        })

        await tx.user.delete({
          where: {
            id: user.id,
          },
        })
      })
    }

    const client = await clerkClient()
    await client.users.deleteUser(clerkId)
    await invalidateActiveUserCache(clerkId)
    await refreshDeletedAccountCaches(productIds)

    return { success: true }
  } catch (error) {
    console.error("[member.account.delete] Failed to delete account", error)
    return { error: "Failed to delete account" }
  }
}
