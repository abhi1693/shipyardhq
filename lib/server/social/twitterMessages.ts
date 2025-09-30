const MAX_TWEET_LENGTH = 280
const DEFAULT_HASHTAGS = ["ShipyardHQ"]

type TweetParts = {
  headline: string
  body?: string
  url?: string
  hashtags?: string[]
}

function truncateSegment(value: string, limit: number): string {
  if (value.length <= limit) {
    return value
  }
  if (limit <= 3) {
    return value.slice(0, Math.max(0, limit))
  }
  const sliced = value.slice(0, limit - 3).replace(/\s+$/g, "")
  return `${sliced}...`
}

function appendSegment(current: string, segment: string): string {
  const trimmed = segment.trim()
  if (!trimmed.length) {
    return current
  }

  const separator = current.length ? "\n" : ""
  const available = MAX_TWEET_LENGTH - current.length - separator.length
  if (available <= 0) {
    return current
  }

  const next =
    trimmed.length <= available ? trimmed : truncateSegment(trimmed, available)
  return `${current}${separator}${next}`
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
  const hashtags = sanitizeHashtags([
    ...DEFAULT_HASHTAGS,
    ...(parts.hashtags ?? []),
  ])

  let hashtagsText = hashtags.map((tag) => `#${tag}`).join(" ")
  const url = parts.url?.trim() ?? ""

  let reservedTailLength = 0
  if (url.length) {
    reservedTailLength += url.length + 1
  }
  if (hashtagsText.length) {
    reservedTailLength += hashtagsText.length + 1
  }

  if (reservedTailLength > MAX_TWEET_LENGTH && hashtagsText.length) {
    // Drop hashtags when they would crowd out the URL entirely.
    hashtagsText = ""
    reservedTailLength = url.length ? url.length + 1 : 0
  }

  let headline = parts.headline.trim()
  const maxHeadlineLength = Math.max(0, MAX_TWEET_LENGTH - reservedTailLength)
  if (headline.length > maxHeadlineLength) {
    headline = truncateSegment(headline, maxHeadlineLength)
  }

  let tweet = ""
  tweet = appendSegment(tweet, headline)

  if (parts.body) {
    const trimmedBody = parts.body.trim()
    if (trimmedBody.length) {
      const separatorCost = tweet.length ? 1 : 0
      const availableForBody =
        MAX_TWEET_LENGTH - tweet.length - reservedTailLength - separatorCost
      if (availableForBody > 0) {
        const safeBody =
          trimmedBody.length <= availableForBody
            ? trimmedBody
            : truncateSegment(trimmedBody, availableForBody)
        tweet = appendSegment(tweet, safeBody)
      }
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

export function buildProductLaunchTweet(args: {
  name: string
  tagline?: string | null
  url: string
  twitterHandle?: string | null
}): string {
  const headline = `New launch on Shipyard HQ: ${args.name}`
  const mention = args.twitterHandle?.trim()
  const bodyParts: string[] = []
  if (mention) {
    bodyParts.push(mention.startsWith("@") ? mention : `@${mention}`)
  }
  if (args.tagline?.trim().length) {
    bodyParts.push(args.tagline.trim())
  }
  const body = bodyParts.length ? bodyParts.join(" — ") : undefined
  return composeTweet({
    headline,
    body,
    url: args.url,
    hashtags: ["ProductLaunch", "IndieSaaS"],
  })
}

const BADGE_COPY: Record<
  "featured" | "trending" | "editor-pick",
  {
    headline: (name: string) => string
    hashtags: string[]
  }
> = {
  trending: {
    headline: (name) => `Trending on Shipyard HQ: ${name}`,
    hashtags: ["Trending", "ProductDiscovery"],
  },
  featured: {
    headline: (name) => `Featured spotlight: ${name}`,
    hashtags: ["Featured", "IndieMakers"],
  },
  "editor-pick": {
    headline: (name) => `Editor's pick: ${name}`,
    hashtags: ["EditorsPick", "ProductDiscovery"],
  },
}

export function buildBadgeTweet(args: {
  badge: string
  name: string
  tagline?: string | null
  url: string
  twitterHandle?: string | null
}): string | null {
  if (!Object.prototype.hasOwnProperty.call(BADGE_COPY, args.badge)) {
    return null
  }

  const copy = BADGE_COPY[args.badge as keyof typeof BADGE_COPY]
  const mention = args.twitterHandle?.trim()
  const bodyParts: string[] = []
  if (mention) {
    bodyParts.push(mention.startsWith("@") ? mention : `@${mention}`)
  }
  if (args.tagline?.trim().length) {
    bodyParts.push(args.tagline.trim())
  }
  const body = bodyParts.length ? bodyParts.join(" — ") : undefined
  return composeTweet({
    headline: copy.headline(args.name),
    body,
    url: args.url,
    hashtags: copy.hashtags,
  })
}

export function buildLeaderboardTweet(args: {
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}): string {
  const sorted = [...args.winners].sort((a, b) => a.rank - b.rank)
  const leader = sorted[0]
  const leaderName = leader?.name ?? "Shipyard builders"
  const leaderHandle = leader?.twitterHandle
    ? leader.twitterHandle.startsWith("@")
      ? leader.twitterHandle
      : `@${leader.twitterHandle}`
    : null
  const headline = leaderHandle
    ? `${leaderName} (${leaderHandle}) leads the ${args.monthLabel} leaderboard!`
    : `${leaderName} leads the ${args.monthLabel} leaderboard!`

  const topEntries = sorted.slice(0, 3).map((entry) => {
    const handle = entry.twitterHandle
      ? entry.twitterHandle.startsWith("@")
        ? entry.twitterHandle
        : `@${entry.twitterHandle}`
      : null
    return handle
      ? `${entry.rank}. ${entry.name} (${handle})`
      : `${entry.rank}. ${entry.name}`
  })

  const body = topEntries.length
    ? ["Top builders:", ...topEntries].join("\n")
    : undefined

  return composeTweet({
    headline,
    body,
    url: args.leaderboardUrl,
    hashtags: ["Leaderboard", "Community"],
  })
}

export function _testHelpers() {
  return {
    truncateSegment,
    appendSegment,
    sanitizeHashtags,
  }
}

const HANDLE_REGEX = /^[A-Za-z0-9_]{1,15}$/

export function extractTwitterHandle(
  value?: string | null,
): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.length) return null

  const direct = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed
  if (HANDLE_REGEX.test(direct)) {
    return `@${direct}`
  }

  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]{1,15})/i,
  )
  if (match && match[1]) {
    return `@${match[1]}`
  }

  return null
}
