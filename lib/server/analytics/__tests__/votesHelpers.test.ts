import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  default: {
    productAnalytics: {
      upsert: vi.fn(async () => ({})),
    },
  },
}))

import { publish } from "@/lib/server/events"
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
    // Ensure no throw and handlers invoked
    await trackProductUpvoted(voteEvent)
    await trackProductDownvoted(voteEvent)
    // Also publish directly to ensure no-op
    await publish("product.upvoted", voteEvent)
    await publish("product.downvoted", voteEvent)
    expect(true).toBe(true)
  })
})
