import {
  buildBadgeCopy,
  buildLaunchCopy,
  buildLeaderboardCopy,
} from "@/lib/server/social/templates"

export async function buildLinkedInProductLaunchPost(args: {
  name: string
  tagline: string
  url: string
  twitterHandle?: string | null
}) {
  const copy = buildLaunchCopy({
    name: args.name,
    tagline: args.tagline,
  }).linkedin

  const lines: Array<string | null | undefined> = [
    copy.headline,
    copy.body,
    `Take a look: ${args.url}`,
  ]

  return lines.filter((line): line is string => Boolean(line)).join("\n\n")
}

export async function buildLinkedInBadgePost(args: {
  badge: string
  name: string
  url: string
  twitterHandle?: string | null
}) {
  const copy = buildBadgeCopy({
    badge: args.badge,
    name: args.name,
  })

  if (!copy) {
    return null
  }

  const lines: Array<string | null | undefined> = [
    copy.linkedin.headline,
    copy.linkedin.body,
    `See more: ${args.url}`,
  ]

  return lines.filter((line): line is string => Boolean(line)).join("\n\n")
}

export async function buildLinkedInLeaderboardPost(args: {
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}) {
  const copy = buildLeaderboardCopy({
    monthLabel: args.monthLabel,
    winners: args.winners,
  }).linkedin

  const lines: Array<string | null | undefined> = [
    copy.headline,
    copy.body,
    `Full board: ${args.leaderboardUrl}`,
  ]

  return lines.filter((line): line is string => Boolean(line)).join("\n\n")
}
