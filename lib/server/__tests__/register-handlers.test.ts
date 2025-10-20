import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const EXPECTED_REGISTRATIONS = [
  { event: "product.created", handlerId: "plans.attach-default-plan" },
  { event: "product.created", handlerId: "badges.auto-assign-new" },
  { event: "product.created", handlerId: "product-insights.initial-pipeline" },
  {
    event: "product.created",
    handlerId: "email.product-verification-reminder",
  },
  { event: "product.upvoted", handlerId: "rewards.award-upvote" },
  { event: "product.upvoted", handlerId: "email.product-vote-milestone" },
  { event: "product.upvoted", handlerId: "analytics.increment-upvotes" },
  { event: "product.reviewed", handlerId: "rewards.award-review" },
  { event: "product.downvoted", handlerId: "analytics.decrement-upvotes" },
  { event: "badge.assigned", handlerId: "badges.apply-default-expiry" },
  { event: "badge.assigned", handlerId: "twitter.badge-assigned" },
  { event: "product.updated", handlerId: "badges.refresh-new-badge" },
  { event: "product.deleted", handlerId: "badges.deleted-cleanup" },
  { event: "product.published", handlerId: "twitter.product-published" },
  { event: "product.clicked", handlerId: "analytics.record-product-click" },
  { event: "analytics.product-traffic", handlerId: "analytics.record-product-traffic" },
  { event: "rewards.awarded", handlerId: "email.backlink-verified-reward" },
  { event: "rewards.daily-login", handlerId: "rewards.daily-login" },
  {
    event: "leaderboard.monthly.winners",
    handlerId: "twitter.leaderboard-winners",
  },
]

describe("register-handlers wiring", () => {
  let resolveRegisteredHandler: typeof import("@/lib/server/events").resolveRegisteredHandler
  let listRegisteredAsyncHandlers: typeof import("@/lib/server/events").listRegisteredAsyncHandlers

  beforeEach(async () => {
    vi.resetModules()
    process.env.TWITTER_BOT_DRY_RUN = "true"

    const eventsModule = await import("@/lib/server/events")
    eventsModule.resetEventRegistryForTesting()
    await import("@/lib/server/events/register-handlers")

    resolveRegisteredHandler = eventsModule.resolveRegisteredHandler
    listRegisteredAsyncHandlers = eventsModule.listRegisteredAsyncHandlers
  })

  afterEach(() => {
    delete process.env.TWITTER_BOT_DRY_RUN
  })

  it("registers expected handlers", () => {
    for (const { event, handlerId } of EXPECTED_REGISTRATIONS) {
      const registration = resolveRegisteredHandler(event, handlerId)
      expect(registration).toBeDefined()

      const asyncHandlers = listRegisteredAsyncHandlers(event)
      expect(asyncHandlers).toContain(handlerId)
    }
  })
})
