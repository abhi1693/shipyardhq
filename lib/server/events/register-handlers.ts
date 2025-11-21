// Dynamically register all event listeners. We import lazily to avoid circular
// initialization issues when listeners depend on the events module itself.
export async function registerEventHandlers(): Promise<void> {
  const modules: Array<{ path: string; load: () => Promise<unknown> }> = [
    { path: "@/lib/server/plans", load: () => import("@/lib/server/plans") },
    { path: "@/lib/server/badges", load: () => import("@/lib/server/badges") },
    {
      path: "@/lib/server/productInsights/initialPipeline",
      load: () => import("@/lib/server/productInsights/initialPipeline"),
    },
    {
      path: "@/lib/server/email/productVoteMilestone",
      load: () => import("@/lib/server/email/productVoteMilestone"),
    },
    {
      path: "@/lib/server/email/backlinkVerifiedReward",
      load: () => import("@/lib/server/email/backlinkVerifiedReward"),
    },
    {
      path: "@/lib/server/rewards/listeners",
      load: () => import("@/lib/server/rewards/listeners"),
    },
    {
      path: "@/lib/server/rewards/loginReward",
      load: () => import("@/lib/server/rewards/loginReward"),
    },
    {
      path: "@/lib/server/rewards/engagement",
      load: () => import("@/lib/server/rewards/engagement"),
    },
    {
      path: "@/lib/server/notifications/listeners",
      load: () => import("@/lib/server/notifications/listeners"),
    },
    {
      path: "@/lib/server/social/twitterBot",
      load: () => import("@/lib/server/social/twitterBot"),
    },
    {
      path: "@/lib/server/analytics/productClicks",
      load: () => import("@/lib/server/analytics/productClicks"),
    },
    {
      path: "@/lib/server/analytics/productTraffic",
      load: () => import("@/lib/server/analytics/productTraffic"),
    },
    {
      path: "@/lib/server/payments/listeners",
      load: () => import("@/lib/server/payments/listeners"),
    },
  ]

  const results = await Promise.allSettled(
    modules.map((module) => module.load()),
  )
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[events] failed to register handler module", {
        module: modules[index]?.path,
        error: result.reason,
      })
    }
  })
}

export default registerEventHandlers
