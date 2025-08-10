"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    })
    if (!user) return { ..._prevState, error: "Unauthorized" }

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
      await prisma.$transaction([
        (prisma as any).productUpvote.delete({
          where: { productId_userId: { productId: product.id, userId: user.id } },
        }),
        prisma.productAnalytics.upsert({
          where: { productId: product.id },
          update: { upvotes: { decrement: 1 } },
          create: { productId: product.id, upvotes: 0, views: 0, clicks: 0 },
        }),
      ])
    } else {
      await prisma.$transaction([
        (prisma as any).productUpvote.create({
          data: { productId: product.id, userId: user.id },
        }),
        prisma.productAnalytics.upsert({
          where: { productId: product.id },
          update: { upvotes: { increment: 1 } },
          create: { productId: product.id, upvotes: 1, views: 0, clicks: 0 },
        }),
      ])
    }

    const result = await prisma.productAnalytics.findUnique({
      where: { productId: product.id },
      select: { upvotes: true },
    })

    return { upvotes: result?.upvotes ?? 0, upvoted: !existing }
  } catch (err: any) {
    console.error("Upvote action error:", err)
    return { ..._prevState, error: err?.message || "Failed" }
  }
}
