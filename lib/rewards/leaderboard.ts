export const REWARDS_LEADERBOARD_DEFAULT_LIMIT = 50
export const REWARDS_LEADERBOARD_MAX_LIMIT = 200

export function normalizeRewardsLeaderboardLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return REWARDS_LEADERBOARD_DEFAULT_LIMIT
  }

  const clamped = Math.min(
    Math.max(Math.floor(limit), 1),
    REWARDS_LEADERBOARD_MAX_LIMIT,
  )

  return clamped
}
