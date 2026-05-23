// Dynamically register all event listeners. We import lazily to avoid circular
// initialization issues when listeners depend on the events module itself.
export async function registerEventHandlers(): Promise<void> {
  const modules: Array<{ path: string; load: () => Promise<unknown> }> = [
    { path: "@/lib/server/plans", load: () => import("@/lib/server/plans") },
    { path: "@/lib/server/badges", load: () => import("@/lib/server/badges") },
    {
      path: "@/lib/server/promotions/trendingBoostPromo",
      load: () => import("@/lib/server/promotions/trendingBoostPromo"),
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
      path: "@/lib/server/social/twitterBot",
      load: () => import("@/lib/server/social/twitterBot"),
    },
    {
      path: "@/lib/server/social/linkedinBot",
      load: () => import("@/lib/server/social/linkedinBot"),
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

  const failures = results.filter((result) => result.status === "rejected")
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((result) => result.reason),
      "Failed to register one or more event handler modules",
    )
  }
}

export default registerEventHandlers
