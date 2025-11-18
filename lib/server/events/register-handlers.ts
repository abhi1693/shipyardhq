// Dynamically register all event listeners. We import lazily to avoid circular
// initialization issues when listeners depend on the events module itself.
export async function registerEventHandlers(): Promise<void> {
  const modules = [
    "@/lib/server/plans",
    "@/lib/server/badges",
    "@/lib/server/productInsights/initialPipeline",
    "@/lib/server/email/productVerificationReminder",
    "@/lib/server/email/productVoteMilestone",
    "@/lib/server/email/backlinkVerifiedReward",
    "@/lib/server/rewards/listeners",
    "@/lib/server/rewards/loginReward",
    "@/lib/server/rewards/engagement",
    "@/lib/server/notifications/listeners",
    "@/lib/server/social/twitterBot",
    "@/lib/server/analytics/productVotes",
    "@/lib/server/analytics/productClicks",
    "@/lib/server/analytics/productTraffic",
    "@/lib/server/payments/listeners",
  ]

  const results = await Promise.allSettled(modules.map((modulePath) => import(modulePath)))
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[events] failed to register handler module", {
        module: modules[index],
        error: result.reason,
      })
    }
  })
}

export default registerEventHandlers
