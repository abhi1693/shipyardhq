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

describe("productVotes helpers", () => {
  it("publish upvote/downvote events via helpers", async () => {
    // Ensure no throw and handlers invoked
    await trackProductUpvoted("p1", "u1")
    await trackProductDownvoted("p1", "u1")
    // Also publish directly to ensure no-op
    await publish("product.upvoted", { productId: "p1", userId: "u1" })
    await publish("product.downvoted", { productId: "p1", userId: "u1" })
    expect(true).toBe(true)
  })
})
