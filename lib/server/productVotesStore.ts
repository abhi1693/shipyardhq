import prisma from "@/lib/prisma"
import {
  dispatchEventAsync,
  type AppEvents,
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
  return mutateVote({ productId, userId })
}

export async function getLiveUpvoteCount(productId: string): Promise<number> {
  const record = await prisma.productAnalytics.findUnique({
    where: { productId },
    select: { upvotes: true },
  })
  return record?.upvotes ?? 0
}

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
}: {
  productId: string
  userId: string
}): Promise<VoteMutationResult> {
  let createdEvent: ProductUpvotedEvent | null = null

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

    if (previousState === "upvoted") {
      // Upvotes are permanent; once a user upvotes we keep the record.
      return {
        previousState,
        newState: previousState,
        upvotes: baseCount,
      }
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

    return {
      previousState,
      newState: "upvoted" as VoteState,
      upvotes: baseCount + 1,
    }
  })

  if (createdEvent) {
    scheduleEvent("product.upvoted", createdEvent)
  }

  return mutation
}
