import { toggleVoteState } from "@/lib/server/productVotesStore"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"

export type UpvoteState = { upvotes: number; upvoted: boolean; error?: string }

export interface ToggleProductUpvoteOptions {
  productId: string
  clerkUserId: string
}

export class UpvoteError extends Error {
  status: number
  constructor(
    message: string,
    status: number,
    public cause?: unknown,
  ) {
    super(message)
    this.name = "UpvoteError"
    this.status = status
  }
}

export async function toggleProductUpvote({
  productId,
  clerkUserId,
}: ToggleProductUpvoteOptions): Promise<UpvoteState> {
  if (!productId) {
    throw new UpvoteError("Missing productId", 400)
  }

  if (!clerkUserId) {
    throw new UpvoteError("Unauthorized", 401)
  }

  let user = await getActiveUserByClerkId(clerkUserId)
  if (!user) {
    try {
      const clerkUser = await getClerkUserByIdCached(clerkUserId)
      await syncUserFromClerk(clerkUser)
      user = await getActiveUserByClerkId(clerkUserId)
    } catch (error) {
      console.error("Failed to sync user before upvote", {
        error,
        clerkUserId,
      })
    }
  }
  if (!user) {
    throw new UpvoteError(INACTIVE_ACCOUNT_MESSAGE, 403)
  }

  try {
    const { newState, upvotes } = await toggleVoteState({
      productId,
      userId: user.id,
    })

    return { upvotes, upvoted: newState === "upvoted" }
  } catch (err: any) {
    if (err?.code === "P2003") {
      throw new UpvoteError("Not Found", 404, err)
    }
    console.error("Upvote toggle error:", err)
    throw new UpvoteError(err?.message || "Failed", 500, err)
  }
}
