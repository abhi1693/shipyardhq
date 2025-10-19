import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  default: {
    productAnalytics: {
      upsert: vi.fn(async () => ({})),
    },
  },
}))

import { resolveRegisteredHandler } from "@/lib/server/events"
import "@/lib/server/analytics/productVotes"
import {
  trackProductUpvoted,
  trackProductDownvoted,
} from "@/lib/server/analytics/productVotes"

const voteEvent = {
  productId: "p1",
  userId: "u1",
  upvoteId: "p1:u1",
  occurredAt: new Date(),
}

describe("productVotes helpers", () => {
  it("publish upvote/downvote events via helpers", async () => {
    // Ensure no throw and handlers registered
    await trackProductUpvoted(voteEvent)
    await trackProductDownvoted(voteEvent)
    const upvoteHandler = resolveRegisteredHandler(
      "product.upvoted",
      "analytics.increment-upvotes",
    )
    const downvoteHandler = resolveRegisteredHandler(
      "product.downvoted",
      "analytics.decrement-upvotes",
    )
    expect(upvoteHandler).toBeDefined()
    expect(downvoteHandler).toBeDefined()
    expect(true).toBe(true)
  })
})
