export const LEADERBOARD_SCORING_VERSION = 2

export const LEADERBOARD_DAILY_TRAFFIC_CAPS = {
  browserRequests: 500,
  browserVisits: 200,
} as const

export const LEADERBOARD_POINT_CAPS = {
  browserRequests: 30,
  browserVisits: 80,
} as const

export type LeaderboardWeights = {
  browserRequests: number
  browserVisits: number
  upvotes: number
}

export const DEFAULT_LEADERBOARD_WEIGHTS: LeaderboardWeights = {
  browserRequests: 2,
  browserVisits: 8,
  upvotes: 10,
}

export type LeaderboardScoringInput = {
  browserRequests: number
  browserVisits: number
  upvotes: number
}

function nonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

export function capDailyLeaderboardTraffic(input: {
  browserRequests: number
  browserVisits: number
}) {
  return {
    browserRequests: Math.min(
      nonNegativeInteger(input.browserRequests),
      LEADERBOARD_DAILY_TRAFFIC_CAPS.browserRequests,
    ),
    browserVisits: Math.min(
      nonNegativeInteger(input.browserVisits),
      LEADERBOARD_DAILY_TRAFFIC_CAPS.browserVisits,
    ),
  }
}

function logarithmicPoints(value: number, weight: number, cap: number) {
  const normalizedValue = nonNegativeInteger(value)
  const normalizedWeight = Math.max(0, Number.isFinite(weight) ? weight : 0)
  return Math.min(
    cap,
    Math.round(normalizedWeight * Math.log2(normalizedValue + 1)),
  )
}

export function scoreLeaderboardMetrics(
  input: LeaderboardScoringInput,
  weights: LeaderboardWeights = DEFAULT_LEADERBOARD_WEIGHTS,
) {
  const browserRequests = nonNegativeInteger(input.browserRequests)
  const browserVisits = nonNegativeInteger(input.browserVisits)
  const upvotes = nonNegativeInteger(input.upvotes)
  const browserRequestPoints = logarithmicPoints(
    browserRequests,
    weights.browserRequests,
    LEADERBOARD_POINT_CAPS.browserRequests,
  )
  const browserVisitPoints = logarithmicPoints(
    browserVisits,
    weights.browserVisits,
    LEADERBOARD_POINT_CAPS.browserVisits,
  )
  const upvotePoints = Math.round(upvotes * Math.max(0, weights.upvotes))
  const finalScore = browserRequestPoints + browserVisitPoints + upvotePoints

  return {
    score: finalScore,
    components: {
      scoringVersion: LEADERBOARD_SCORING_VERSION,
      scoredBrowserRequests: browserRequests,
      scoredBrowserVisits: browserVisits,
      upvotes,
      browserRequestPoints,
      browserVisitPoints,
      upvotePoints,
      finalScore,
    },
  }
}
