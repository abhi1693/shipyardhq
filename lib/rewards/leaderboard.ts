export const REWARDS_LEADERBOARD_DEFAULT_LIMIT = 50
export const REWARDS_LEADERBOARD_MAX_LIMIT = 200
export const REWARDS_LEADERBOARD_PAGE_SIZE = 25
export const REWARDS_LEADERBOARD_MAX_PAGE_SIZE = 100

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

export function normalizeRewardsLeaderboardPage(page?: number): number {
  if (typeof page !== "number" || !Number.isFinite(page) || page <= 0) {
    return 1
  }
  return Math.floor(page)
}

export function normalizeRewardsLeaderboardPageSize(
  pageSize?: number,
): number {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize)) {
    return REWARDS_LEADERBOARD_PAGE_SIZE
  }

  const clamped = Math.min(
    Math.max(Math.floor(pageSize), 1),
    REWARDS_LEADERBOARD_MAX_PAGE_SIZE,
  )

  return clamped
}
