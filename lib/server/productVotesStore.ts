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

export interface VoteMutationResult {
  previousState: VoteState
  newState: VoteState
  upvotes: number
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
  const result = await mutateVote({
    productId,
    userId,
    desiredState,
  })
  return result.newState
}

export async function toggleVoteState({
  productId,
  userId,
}: {
  productId: string
  userId: string
}): Promise<VoteMutationResult> {
  return mutateVote({ productId, userId, desiredState: "toggle" })
}

export async function getLiveUpvoteCount(productId: string): Promise<number> {
  const record = await prisma.productAnalytics.findUnique({
    where: { productId },
    select: { upvotes: true },
  })
  return record?.upvotes ?? 0
}

type VoteMutationTarget = VoteState | "toggle"

async function mutateVote({
  productId,
  userId,
  desiredState,
}: {
  productId: string
  userId: string
  desiredState: VoteMutationTarget
}): Promise<VoteMutationResult> {
  const now = new Date()
  let createdEvent: ProductUpvotedEvent | null = null
  let removedEvent: ProductDownvotedEvent | null = null

  const mutation = await prisma.$transaction(async (tx) => {
    const existing = await tx.productUpvote.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { id: true, createdAt: true },
    })

    const previousState: VoteState = existing ? "upvoted" : "not_upvoted"
    const targetState: VoteState =
      desiredState === "toggle"
        ? previousState === "upvoted"
          ? "not_upvoted"
          : "upvoted"
        : desiredState

    if (targetState === previousState) {
      const analytics = await tx.productAnalytics.findUnique({
        where: { productId },
        select: { upvotes: true },
      })

      return {
        previousState,
        newState: previousState,
        upvotes: analytics?.upvotes ?? 0,
      }
    }

    if (targetState === "upvoted") {
      const created = await tx.productUpvote.create({
        data: { productId, userId },
        select: { id: true, createdAt: true },
      })

      const analytics = await tx.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { increment: 1 } },
        create: { productId, upvotes: 1, clicks: 0 },
        select: { upvotes: true },
      })

      createdEvent = {
        productId,
        userId,
        upvoteId: created.id,
        occurredAt: created.createdAt,
      }

      return {
        previousState,
        newState: "upvoted" as VoteState,
        upvotes: analytics.upvotes,
      }
    }

    if (!existing) {
      const analytics = await tx.productAnalytics.findUnique({
        where: { productId },
        select: { upvotes: true },
      })

      return {
        previousState,
        newState: previousState,
        upvotes: analytics?.upvotes ?? 0,
      }
    }

    await tx.productUpvote.delete({
      where: { productId_userId: { productId, userId } },
    })

    const analytics = await tx.productAnalytics.upsert({
      where: { productId },
      update: { upvotes: { decrement: 1 } },
      create: { productId, upvotes: 0, clicks: 0 },
      select: { upvotes: true },
    })

    removedEvent = {
      productId,
      userId,
      upvoteId: existing.id,
      occurredAt: now,
    }

    return {
      previousState,
      newState: "not_upvoted" as VoteState,
      upvotes: Math.max(analytics.upvotes, 0),
    }
  })

  const publishes: Promise<void>[] = []
  if (createdEvent)
    publishes.push(dispatchEvent("product.upvoted", createdEvent))
  if (removedEvent)
    publishes.push(dispatchEvent("product.downvoted", removedEvent))
  if (publishes.length) {
    await Promise.all(publishes)
  }

  return mutation
}
