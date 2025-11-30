import {
  buildBadgeTweet,
  buildLeaderboardTweet,
  buildProductLaunchTweet,
  extractTwitterHandle,
} from "./twitterMessages"

export function extractLinkedInHandle(
  value?: string | null,
): string | null {
  return extractTwitterHandle(value)
}

export async function buildLinkedInProductLaunchPost(args: {
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  twitterHandle?: string | null
}) {
  return buildProductLaunchTweet(args)
}

export async function buildLinkedInBadgePost(args: {
  badge: string
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  twitterHandle?: string | null
}) {
  return buildBadgeTweet(args)
}

export async function buildLinkedInLeaderboardPost(args: {
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}) {
  return buildLeaderboardTweet(args)
}
