import {
  formatDisplayName,
  normalizeTwitterHandle,
  normalizeWinners,
  rankEmoji,
} from "@/lib/server/social/shared"
import { siteConfig } from "@/lib/siteConfig"

type LaunchArgs = {
  name: string
  twitterHandle?: string | null
  tagline: string
}

export function buildLaunchCopy(args: LaunchArgs) {
  const handle = normalizeTwitterHandle(args.twitterHandle)
  const displayName = formatDisplayName(args.name, handle)
  const body = args.tagline.trim()
  const launchTags = ["#ProductLaunch", "#IndieSaaS"]
  const brand = siteConfig.name

  return {
    twitter: {
      headline: `${displayName} just launched on ${brand}!`,
      body,
      hashtags: launchTags,
    },
    linkedin: {
      headline: `${args.name} just launched on ${brand}.`,
      body,
      hashtags: launchTags,
    },
  }
}

const BADGE_COPY = {
  trending: {
    headline: (displayName: string) =>
      `🔥 ${displayName} is trending on ${siteConfig.name}!`,
    hashtags: ["#Trending", "#ProductDiscovery"],
    note: "Tons of builders are checking this out right now.",
  },
  featured: {
    headline: (displayName: string) =>
      `🌟 ${displayName} earned a Featured spotlight on ${siteConfig.name}!`,
    hashtags: ["#Featured", "#IndieMakers"],
    note: "Standout build the community keeps coming back to.",
  },
  "editor-pick": {
    headline: (displayName: string) =>
      `🧭 Editor's pick: ${displayName} on ${siteConfig.name}!`,
    hashtags: ["#EditorsPick", "#ProductDiscovery"],
    note: "Our curated pick—we want everyone to see this.",
  },
} as const

type BadgeKey = keyof typeof BADGE_COPY

export function buildBadgeCopy(args: {
  badge: string
  name: string
  twitterHandle?: string | null
}) {
  if (!Object.prototype.hasOwnProperty.call(BADGE_COPY, args.badge)) {
    return null
  }
  const copy = BADGE_COPY[args.badge as BadgeKey]
  const handle = normalizeTwitterHandle(args.twitterHandle)
  const displayName = formatDisplayName(args.name, handle)

  return {
    twitter: {
      headline: copy.headline(displayName),
      body: copy.note,
      hashtags: [...copy.hashtags],
    },
    linkedin: {
      headline: copy.headline(args.name),
      body: copy.note,
      hashtags: [...copy.hashtags],
    },
  }
}

type LeaderboardArgs = {
  monthLabel: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}

export function buildLeaderboardCopy(args: LeaderboardArgs) {
  const normalized = normalizeWinners(args.winners)
  const leader = normalized[0]
  const leaderName = leader?.name ?? "Shipyard builders"
  const leaderHandle = normalizeTwitterHandle(leader?.twitterHandle)
  const brand = siteConfig.name || "Shipyard HQ"

  const twitterHeadline = leaderHandle
    ? `${leaderName} (${leaderHandle}) leads the ${args.monthLabel} leaderboard on ${brand}!`
    : `${leaderName} leads the ${args.monthLabel} leaderboard on ${brand}!`

  const twitterBody = normalized.length
    ? [
        "Top builders:",
        ...normalized.map((entry) => {
          const handle = normalizeTwitterHandle(entry.twitterHandle)
          const emoji = rankEmoji(entry.rank)
          return handle
            ? `${emoji} ${entry.name} (${handle})`
            : `${emoji} ${entry.name}`
        }),
      ].join("\n")
    : undefined

  const linkedinHeadline = `${leaderName} leads the ${args.monthLabel} leaderboard on ${brand}!`
  const linkedinBody = normalized.length
    ? [
        "Top builders:",
        ...normalized.map((entry) => `${rankEmoji(entry.rank)} ${entry.name}`),
      ].join("\n")
    : undefined

  return {
    twitter: {
      headline: twitterHeadline,
      body: twitterBody,
      hashtags: ["#Leaderboard", "#Community"],
    },
    linkedin: {
      headline: linkedinHeadline,
      body: linkedinBody,
      hashtags: ["#Leaderboard", "#Community"],
    },
  }
}
