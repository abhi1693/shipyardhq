import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { APP_EVENTS } from "@/lib/server/events/constants"

const EXPECTED_REGISTRATIONS = [
  { event: APP_EVENTS.PRODUCT_CREATED, handlerId: "plans.attach-default-plan" },
  { event: APP_EVENTS.PRODUCT_CREATED, handlerId: "badges.auto-assign-new" },
  {
    event: APP_EVENTS.PRODUCT_CREATED,
    handlerId: "product-insights.initial-pipeline",
  },
  {
    event: APP_EVENTS.PRODUCT_CREATED,
    handlerId: "email.product-verification-reminder",
  },
  { event: APP_EVENTS.PRODUCT_UPVOTED, handlerId: "rewards.award-upvote" },
  {
    event: APP_EVENTS.PRODUCT_UPVOTED,
    handlerId: "email.product-vote-milestone",
  },
  {
    event: APP_EVENTS.PRODUCT_UPVOTED,
    handlerId: "analytics.increment-upvotes",
  },
  {
    event: APP_EVENTS.PRODUCT_UPVOTED,
    handlerId: "notifications.product-upvote",
  },
  { event: APP_EVENTS.PRODUCT_REVIEWED, handlerId: "rewards.award-review" },
  {
    event: APP_EVENTS.PRODUCT_REVIEWED,
    handlerId: "notifications.product-reviewed",
  },
  {
    event: APP_EVENTS.PRODUCT_DOWNVOTED,
    handlerId: "analytics.decrement-upvotes",
  },
  {
    event: APP_EVENTS.BADGE_ASSIGNED,
    handlerId: "badges.apply-default-expiry",
  },
  { event: APP_EVENTS.BADGE_ASSIGNED, handlerId: "twitter.badge-assigned" },
  { event: APP_EVENTS.PRODUCT_UPDATED, handlerId: "badges.refresh-new-badge" },
  { event: APP_EVENTS.PRODUCT_DELETED, handlerId: "badges.deleted-cleanup" },
  {
    event: APP_EVENTS.PRODUCT_PUBLISHED,
    handlerId: "twitter.product-published",
  },
  {
    event: APP_EVENTS.PRODUCT_CLICKED,
    handlerId: "analytics.record-product-click",
  },
  {
    event: APP_EVENTS.ANALYTICS_PRODUCT_TRAFFIC,
    handlerId: "analytics.record-product-traffic",
  },
  {
    event: APP_EVENTS.REWARDS_AWARDED,
    handlerId: "email.backlink-verified-reward",
  },
  {
    event: APP_EVENTS.REWARDS_AWARDED,
    handlerId: "notifications.rewards-awarded",
  },
  { event: APP_EVENTS.REWARDS_DAILY_LOGIN, handlerId: "rewards.daily-login" },
  {
    event: APP_EVENTS.LEADERBOARD_MONTHLY_WINNERS,
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
