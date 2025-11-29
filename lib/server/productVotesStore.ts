import prisma from "@/lib/prisma"
import { Prisma } from "@/lib/vendor/prisma/client"
import {
  dispatchEventAsync,
  type AppEvents,
  type ProductUpvotedEvent,
} from "@/lib/server/events"
import { refreshLeaderboardForProducts } from "@/lib/server/leaderboard/v2"
import {
  revalidateLeaderboard,
  revalidateProduct,
} from "@/lib/cache/revalidate"
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

export async function toggleVoteState({
  productId,
  userId,
}: {
  productId: string
  userId: string
}): Promise<VoteMutationResult> {
  return mutateVote({ productId, userId })
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
  let analyticsUpdated = false

  const mutation = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
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

      const analyticsUpdate = await tx.productAnalytics.upsert({
        where: { productId },
        update: { upvotes: { increment: 1 } },
        create: { productId, upvotes: baseCount + 1 },
        select: { upvotes: true },
      })

      analyticsUpdated = true
      createdEvent = {
        productId,
        userId,
        upvoteId: created.id,
        occurredAt: created.createdAt,
      }

      return {
        previousState,
        newState: "upvoted" as VoteState,
        upvotes:
          typeof analyticsUpdate.upvotes === "number"
            ? analyticsUpdate.upvotes
            : baseCount + 1,
      }
    },
  )

  if (createdEvent) {
    scheduleEvent("product.upvoted", createdEvent)

    const occurredAt =
      createdEvent && typeof createdEvent === "object" && "occurredAt" in createdEvent
        ? (createdEvent as ProductUpvotedEvent).occurredAt
        : new Date()

    void refreshLeaderboardForProducts({
      productIds: [productId],
      now: occurredAt,
    }).catch((error) => {
      console.error("[leaderboard] upvote refresh failed", {
        productId,
        error,
      })
    })

    if (analyticsUpdated) {
      try {
        revalidateProduct(productId, "revalidate")
        revalidateLeaderboard("revalidate")
      } catch (error) {
        console.error("[analytics] upvote revalidation failed", {
          productId,
          error,
        })
      }
    }
  }

  return mutation
}
