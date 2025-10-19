import prisma from "@/lib/prisma"
import {
  dispatchEvent,
  type ProductDownvotedEvent,
  type ProductUpvotedEvent,
} from "@/lib/server/events"
import "@/lib/server/rewards/listeners"
import "@/lib/server/email/productVoteMilestone"

export type VoteState = "upvoted" | "not_upvoted"

export interface VoteResolution {
  currentState: VoteState
  persistedState: VoteState
}

export async function resolveVoteState(
  productId: string,
  userId: string,
): Promise<VoteResolution> {
  const existing = await prisma.productUpvote.findUnique({
    where: { productId_userId: { productId, userId } },
    select: { id: true },
  })
  const persistedState = existing ? "upvoted" : "not_upvoted"
  return {
    currentState: persistedState,
    persistedState,
  }
}

export async function setDesiredVoteState({
  productId,
  userId,
  desiredState,
}: {
  productId: string
  userId: string
  desiredState: VoteState
}): Promise<VoteState> {
  return toggleVote({ productId, userId, desiredState })
}

export async function getLiveUpvoteCount(productId: string): Promise<number> {
  const record = await prisma.productAnalytics.findUnique({
    where: { productId },
    select: { upvotes: true },
  })
  return record?.upvotes ?? 0
}

async function toggleVote({
  productId,
  userId,
  desiredState,
}: {
  productId: string
  userId: string
  desiredState: VoteState
}): Promise<VoteState> {
  const shouldUpvote = desiredState === "upvoted"
  const now = new Date()
  let createdEvent: ProductUpvotedEvent | null = null
  let removedEvent: ProductDownvotedEvent | null = null

  const finalState = await prisma.$transaction(async (tx) => {
    if (shouldUpvote) {
      const existing = await tx.productUpvote.findUnique({
        where: { productId_userId: { productId, userId } },
        select: { id: true },
      })

      if (existing) {
        return "upvoted" as VoteState
      }

      const created = await tx.productUpvote.create({
        data: { productId, userId },
        select: { id: true, createdAt: true },
      })

      createdEvent = {
        productId,
        userId,
        upvoteId: created.id,
        occurredAt: created.createdAt,
      }

      await tx.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { increment: 1 } },
        create: { productId, upvotes: 1, clicks: 0 },
        select: { productId: true },
      })

      return "upvoted" as VoteState
    }

    const existing = await tx.productUpvote.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { id: true },
    })

    if (!existing) {
      return "not_upvoted" as VoteState
    }

    await tx.productUpvote.delete({
      where: { productId_userId: { productId, userId } },
    })

    await tx.productAnalytics.update({
      where: { productId },
      data: { upvotes: { decrement: 1 } },
      select: { productId: true },
    })

    removedEvent = {
      productId,
      userId,
      upvoteId: existing.id,
      occurredAt: now,
    }

    return "not_upvoted" as VoteState
  })

  const publishes: Promise<void>[] = []
  if (createdEvent)
    publishes.push(dispatchEvent("product.upvoted", createdEvent))
  if (removedEvent)
    publishes.push(dispatchEvent("product.downvoted", removedEvent))
  if (publishes.length) {
    await Promise.all(publishes)
  }

  return finalState
}
