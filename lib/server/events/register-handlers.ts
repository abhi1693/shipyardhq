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
      path: "@/lib/server/social/linkedinBot",
      load: () => import("@/lib/server/social/linkedinBot"),
    },
    {
      path: "@/lib/server/payments/listeners",
      load: () => import("@/lib/server/payments/listeners"),
    },
    {
      path: "@/lib/server/leaderboard/listeners",
      load: () => import("@/lib/server/leaderboard/listeners"),
    },
    {
      path: "@/lib/server/claims/cleanup",
      load: () => import("@/lib/server/claims/cleanup"),
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
