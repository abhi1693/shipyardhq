import prisma from "@/lib/prisma"
import {
  dispatchEventAsync,
  type AppEvents,
  type ProductDownvotedEvent,
  type ProductUpvotedEvent,
} from "@/lib/server/events"
import "@/lib/server/rewards/listeners"
import "@/lib/server/email/productVoteMilestone"
import "@/lib/server/analytics/productVotes"

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

function scheduleEvent<K extends keyof AppEvents>(
  event: K,
  payload: AppEvents[K],
): void {
  queueMicrotask(() => {
    dispatchEventAsync(event, payload, {
      context: { event },
    })
  })
}

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
    const analytics = await tx.productAnalytics.findUnique({
      where: { productId },
      select: { upvotes: true },
    })
    const baseCount =
      analytics?.upvotes ??
      (await tx.productUpvote.count({
        where: { productId },
      }))

    if (desiredState === "toggle" && previousState === "upvoted") {
      // Downvoting is disabled; once a user upvotes we keep the record.
      return {
        previousState,
        newState: previousState,
        upvotes: baseCount,
      }
    }

    const targetState: VoteState =
      desiredState === "toggle" ? "upvoted" : desiredState

    if (targetState === previousState) {
      return {
        previousState,
        newState: previousState,
        upvotes: baseCount,
      }
    }

    if (targetState === "upvoted") {
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

      return {
        previousState,
        newState: "upvoted" as VoteState,
        upvotes: baseCount + 1,
      }
    }

    if (!existing) {
      return {
        previousState,
        newState: previousState,
        upvotes: baseCount,
      }
    }

    await tx.productUpvote.delete({
      where: { productId_userId: { productId, userId } },
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
      upvotes: Math.max(baseCount - 1, 0),
    }
  })

  if (createdEvent) {
    scheduleEvent("product.upvoted", createdEvent)
  }
  if (removedEvent) {
    scheduleEvent("product.downvoted", removedEvent)
  }

  return mutation
}
