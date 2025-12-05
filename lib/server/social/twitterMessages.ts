import { normalizeTwitterHandle } from "@/lib/server/social/shared"
import {
  buildBadgeCopy,
  buildLaunchCopy,
  buildLeaderboardCopy,
} from "@/lib/server/social/templates"

const DEFAULT_HASHTAGS = ["#ShipyardHQ"]

type TweetParts = {
  headline: string
  body?: string
  url?: string
  hashtags?: string[]
}

function appendSegment(current: string, segment: string): string {
  const trimmed = segment.trim()
  if (!trimmed.length) {
    return current
  }

  const separator = current.length ? "\n\n" : ""

  return `${current}${separator}${trimmed}`
}

function sanitizeHashtags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const tag of tags) {
    const trimmed = tag.trim().replace(/^#+/, "")
    if (!trimmed.length) continue
    const cleaned = trimmed.replace(/[^A-Za-z0-9_]/g, "")
    if (!cleaned.length) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
  }

  return result
}

export function composeTweet(parts: TweetParts): string {
  const hashtagsText = [...DEFAULT_HASHTAGS, ...(parts.hashtags ?? [])]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(" ")
  const url = parts.url?.trim() ?? ""

  const headline = parts.headline.trim()

  let tweet = ""
  tweet = appendSegment(tweet, headline)

  if (parts.body) {
    const trimmedBody = parts.body.trim()
    if (trimmedBody.length) {
      tweet = appendSegment(tweet, trimmedBody)
    }
  }

  if (url.length) {
    tweet = appendSegment(tweet, url)
  }

  if (hashtagsText.length) {
    tweet = appendSegment(tweet, hashtagsText)
  }

  return tweet
}

export async function buildProductLaunchTweet(args: {
  name: string
  tagline: string
  url: string
  twitterHandle?: string | null
}): Promise<string> {
  const copy = buildLaunchCopy({
    name: args.name,
    twitterHandle: args.twitterHandle,
    tagline: args.tagline,
  }).twitter

  return composeTweet({
    headline: copy.headline,
    body: copy.body,
    url: args.url,
    hashtags: copy.hashtags,
  })
}

export async function buildBadgeTweet(args: {
  badge: string
  name: string
  url: string
  twitterHandle?: string | null
}): Promise<string | null> {
  const copy = buildBadgeCopy({
    badge: args.badge,
    name: args.name,
    twitterHandle: args.twitterHandle,
  })

  if (!copy) {
    return null
  }

  return composeTweet({
    headline: copy.twitter.headline,
    body: copy.twitter.body,
    url: args.url,
    hashtags: copy.twitter.hashtags,
  })
}

export async function buildLeaderboardTweet(args: {
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}): Promise<string> {
  const copy = buildLeaderboardCopy({
    monthLabel: args.monthLabel,
    winners: args.winners,
  }).twitter

  return composeTweet({
    headline: copy.headline,
    body: copy.body,
    url: args.leaderboardUrl,
    hashtags: copy.hashtags,
  })
}
