import {
  formatHandle,
  formatDisplayName,
  normalizeTwitterHandle,
  rankEmoji,
} from "@/lib/server/social/shared"

const MAX_TWEET_LENGTH = Number.MAX_SAFE_INTEGER
const DEFAULT_HASHTAGS = ["ShipyardHQ"]

type TweetSections = {
  headline: string
  body?: string
}

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

  const separator = current.length ? "\n\n" : ""
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

function ensureHandlePresence(
  sections: TweetSections,
  { name, handle }: { name: string; handle?: string | null },
): TweetSections {
  const normalizedHandle = handle?.trim()
  if (!normalizedHandle) {
    return sections
  }

  const handleValue = normalizedHandle.startsWith("@")
    ? normalizedHandle
    : `@${normalizedHandle}`

  const headlineHasHandle = sections.headline.includes(handleValue)
  const bodyHasHandle = sections.body?.includes(handleValue) ?? false
  if (headlineHasHandle || bodyHasHandle) {
    return sections
  }

  const replacement = `${name} (${handleValue})`
  let headline = sections.headline
  let body = sections.body

  if (headline.includes(name)) {
    const updated = headline.replace(name, replacement)
    if (updated !== headline) {
      headline = updated
    } else {
      headline = `${replacement} — ${headline}`.trim()
    }
  } else {
    headline = `${replacement} — ${headline}`.trim()
  }

  if (!headline.includes(handleValue) && body) {
    body = `${handleValue} ${body}`.trim()
  }

  if (
    !headline.includes(handleValue) &&
    !(body?.includes(handleValue) ?? false)
  ) {
    headline = `${handleValue} — ${headline}`.trim()
  }

  return {
    headline,
    body,
  }
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

export async function buildProductLaunchTweet(args: {
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  twitterHandle?: string | null
}): Promise<string> {
  const handle = args.twitterHandle?.startsWith("@")
    ? args.twitterHandle
    : args.twitterHandle?.length
      ? `@${args.twitterHandle}`
      : null
  const displayName = handle ? `${args.name} (${handle})` : args.name
  const headline = `${displayName} just launched on Shipyard HQ!`
  const body =
    args.tagline && args.tagline.trim().length
      ? args.tagline.trim()
      : args.description && args.description.trim().length
        ? truncateSegment(args.description.trim(), 200)
        : undefined

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
    headline: (displayName: string) => string
    hashtags: string[]
  }
> = {
  trending: {
    headline: (displayName) => `🔥 ${displayName} is trending on Shipyard HQ!`,
    hashtags: ["Trending", "ProductDiscovery"],
  },
  featured: {
    headline: (displayName) =>
      `🌟 ${displayName} earned a Featured spotlight on Shipyard HQ!`,
    hashtags: ["Featured", "IndieMakers"],
  },
  "editor-pick": {
    headline: (displayName) =>
      `🧭 Editor's pick: ${displayName} on Shipyard HQ!`,
    hashtags: ["EditorsPick", "ProductDiscovery"],
  },
}

export async function buildBadgeTweet(args: {
  badge: string
  name: string
  url: string
  twitterHandle?: string | null
}): Promise<string | null> {
  if (!Object.prototype.hasOwnProperty.call(BADGE_COPY, args.badge)) {
    return null
  }

  const copy = BADGE_COPY[args.badge as keyof typeof BADGE_COPY]
  const handle = formatHandle(args.twitterHandle)
  const displayName = formatDisplayName(args.name, handle)
  const headline = copy.headline(displayName)

  const sections = ensureHandlePresence(
    { headline },
    { name: args.name, handle },
  )

  return composeTweet({
    headline: sections.headline,
    body: sections.body,
    url: args.url,
    hashtags: copy.hashtags,
  })
}

export async function buildLeaderboardTweet(args: {
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}): Promise<string> {
  const sorted = [...args.winners].sort((a, b) => a.rank - b.rank)
  const leader = sorted[0]
  const leaderName = leader?.name ?? "Shipyard builders"
  const leaderHandle = formatHandle(leader?.twitterHandle)
  const headline = leaderHandle
    ? `${leaderName} (${leaderHandle}) leads the ${args.monthLabel} leaderboard!`
    : `${leaderName} leads the ${args.monthLabel} leaderboard!`

  const topEntries = sorted.map((entry) => {
    const handle = formatHandle(entry.twitterHandle)
    const emoji = rankEmoji(entry.rank)
    return handle
      ? `${emoji} ${entry.name} (${handle})`
      : `${emoji} ${entry.name}`
  })

  const body = topEntries.length
    ? ["Top builders:", ...topEntries].join("\n")
    : undefined

  const sections = ensureHandlePresence(
    { headline, body },
    { name: leaderName, handle: leaderHandle },
  )

  return composeTweet({
    headline: sections.headline,
    body: sections.body,
    url: args.leaderboardUrl,
    hashtags: ["Leaderboard", "Community"],
  })
}

export function extractTwitterHandle(value?: string | null): string | null {
  return normalizeTwitterHandle(value)
}
