"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"
import "@/lib/server/analytics/productVotes"
import {
  trackProductUpvoted,
  trackProductDownvoted,
} from "@/lib/server/analytics/productVotes"
import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

export type UpvoteState = { upvotes: number; upvoted: boolean; error?: string }

export async function upvoteProductAction(
  _prevState: UpvoteState,
  formData: FormData,
): Promise<UpvoteState> {
  try {
    const productId = String(formData.get("productId") || "")
    if (!productId) return { ..._prevState, error: "Missing productId" }

    const { userId } = await auth()
    if (!userId) return { ..._prevState, error: "Unauthorized" }

    const user = await getActiveUserByClerkId(userId)
    if (!user) return { ..._prevState, error: INACTIVE_ACCOUNT_MESSAGE }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) return { ..._prevState, error: "Not Found" }

    const existing = await (prisma as any).productUpvote.findUnique({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      select: { id: true },
    })

    if (existing) {
      await (prisma as any).productUpvote.delete({
        where: {
          productId_userId: { productId: product.id, userId: user.id },
        },
      })
      await trackProductDownvoted(product.id, user.id)
    } else {
      await (prisma as any).productUpvote.create({
        data: { productId: product.id, userId: user.id },
      })
      await trackProductUpvoted(product.id, user.id)
    }

    const result = await prisma.productAnalytics.findUnique({
      where: { productId: product.id },
      select: { upvotes: true },
    })

    // Invalidate relevant public caches (product page + leaderboard/trending)
    revalidateProduct(product.id)
    revalidateLeaderboard()

    return { upvotes: result?.upvotes ?? 0, upvoted: !existing }
  } catch (err: any) {
    console.error("Upvote action error:", err)
    return { ..._prevState, error: err?.message || "Failed" }
  }
}
