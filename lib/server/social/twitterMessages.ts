import { getOpenAIClient } from "@/lib/server/openai"
import {
  coerceJsonText,
  extractAssistantJson,
} from "@/lib/server/openaiResponse"

const MAX_TWEET_LENGTH = 280
const DEFAULT_HASHTAGS = ["ShipyardHQ"]
const AI_MODEL = "gpt-4.1-mini"
const TWEET_COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", minLength: 6, maxLength: 220 },
    body: { type: ["string", "null"], maxLength: 220 },
  },
  required: ["headline", "body"],
} as const

type TweetRewriteKind = "launch" | "badge" | "leaderboard"

type TweetRewriteContext = {
  kind: TweetRewriteKind
  name: string
  handle?: string | null
  tagline?: string | null
  description?: string | null
  badge?: string
  monthLabel?: string
  winners?: Array<{ rank: number; name: string; handle?: string | null }>
  fallbackHeadline: string
  fallbackBody?: string
}

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

async function rewriteTweetCopyWithAI(
  context: TweetRewriteContext,
): Promise<TweetSections | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return null
  }

  const product = {
    name: context.name,
    handle: context.handle ?? null,
    tagline: context.tagline ?? null,
    description: context.description
      ? truncateSegment(context.description, 420)
      : null,
  }

  if (context.kind === "badge") {
    ;(product as any).badge = context.badge ?? null
  }

  if (context.kind === "leaderboard") {
    ;(product as any).monthLabel = context.monthLabel ?? null
    ;(product as any).winners = (context.winners ?? []).map((winner) => ({
      rank: winner.rank,
      name: winner.name,
      handle: winner.handle ?? null,
    }))
  }

  const summaryByKind: Record<TweetRewriteKind, string> = {
    launch: `${context.name} just launched on Shipyard HQ.`,
    badge: `${context.name} earned the ${context.badge ?? "new"} badge on Shipyard HQ.`,
    leaderboard: `Highlight monthly leaderboard winners for ${context.monthLabel ?? "Shipyard HQ"}.`,
  }

  const payload = {
    summary: summaryByKind[context.kind],
    product,
    fallbackCopy: {
      headline: context.fallbackHeadline,
      body: context.fallbackBody ?? null,
    },
    writingGuidelines: [
      "Write in a warm, human tone that celebrates indie builders.",
      "Return exactly two fields: headline and body (set body to null if no copy is needed).",
      "Do not include URLs, hashtags, or emoji; we add them separately.",
      "Keep the headline under 140 characters and the body under 120 characters.",
      context.description
        ? "Reference the description for extra context, but avoid repeating long phrases verbatim."
        : null,
      context.handle
        ? `Mention the handle exactly as ${context.handle.startsWith("@") ? context.handle : `@${context.handle}`} once. You may also mention the product name.`
        : "No handle is available; focus on the product's name instead.",
    ].filter(Boolean),
  }

  try {
    const openai = getOpenAIClient()
    const response = await openai.responses.create({
      model: AI_MODEL,
      temperature: 0.6,
      max_output_tokens: 200,
      text: {
        format: {
          type: "json_schema",
          name: "shipyard_tweet_copy",
          schema: TWEET_COPY_SCHEMA,
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are Shipyard HQ's social media copywriter. Respond with valid JSON matching the provided schema only.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    } as any)

    const raw = extractAssistantJson(response)
    const jsonText = coerceJsonText(raw)
    if (!jsonText) {
      return null
    }

    const parsed = JSON.parse(jsonText)
    const headline =
      typeof parsed.headline === "string" ? parsed.headline.trim() : ""
    if (!headline.length) {
      return null
    }

    const bodyValue =
      typeof parsed.body === "string" ? parsed.body.trim() : undefined

    return {
      headline,
      body: bodyValue?.length ? bodyValue : undefined,
    }
  } catch (error) {
    console.error(
      `[twitter] AI tweet rewrite failed (kind=${context.kind})`,
      error,
    )
    return null
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
  const fallbackHeadline = `${displayName} just launched on Shipyard HQ!`
  const fallbackBody = args.tagline?.trim()?.length
    ? args.tagline.trim()
    : undefined

  const aiSections = await rewriteTweetCopyWithAI({
    kind: "launch",
    name: args.name,
    handle,
    tagline: args.tagline ?? null,
    description: args.description ?? null,
    fallbackHeadline,
    fallbackBody,
  })

  const sections = ensureHandlePresence(
    aiSections ?? { headline: fallbackHeadline, body: fallbackBody },
    { name: args.name, handle },
  )

  return composeTweet({
    headline: sections.headline,
    body: sections.body,
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
    headline: (displayName) => `${displayName} is trending on Shipyard HQ!`,
    hashtags: ["Trending", "ProductDiscovery"],
  },
  featured: {
    headline: (displayName) =>
      `${displayName} just earned a Featured spotlight!`,
    hashtags: ["Featured", "IndieMakers"],
  },
  "editor-pick": {
    headline: (displayName) => `Editor's pick: ${displayName}!`,
    hashtags: ["EditorsPick", "ProductDiscovery"],
  },
}

export async function buildBadgeTweet(args: {
  badge: string
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  twitterHandle?: string | null
}): Promise<string | null> {
  if (!Object.prototype.hasOwnProperty.call(BADGE_COPY, args.badge)) {
    return null
  }

  const copy = BADGE_COPY[args.badge as keyof typeof BADGE_COPY]
  const handle = args.twitterHandle?.startsWith("@")
    ? args.twitterHandle
    : args.twitterHandle?.length
      ? `@${args.twitterHandle}`
      : null
  const displayName = handle ? `${args.name} (${handle})` : args.name
  const body = args.tagline?.trim()?.length ? args.tagline.trim() : undefined
  const fallbackHeadline = copy.headline(displayName)

  const aiSections = await rewriteTweetCopyWithAI({
    kind: "badge",
    name: args.name,
    handle,
    badge: args.badge,
    tagline: args.tagline ?? null,
    description: args.description ?? null,
    fallbackHeadline,
    fallbackBody: body,
  })

  const sections = ensureHandlePresence(
    aiSections ?? { headline: fallbackHeadline, body },
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

  const aiSections = await rewriteTweetCopyWithAI({
    kind: "leaderboard",
    name: leaderName,
    handle: leaderHandle,
    monthLabel: args.monthLabel,
    winners: sorted.map((entry) => ({
      rank: entry.rank,
      name: entry.name,
      handle: entry.twitterHandle
        ? entry.twitterHandle.startsWith("@")
          ? entry.twitterHandle
          : `@${entry.twitterHandle}`
        : null,
    })),
    fallbackHeadline: headline,
    fallbackBody: body,
  })

  const sections = ensureHandlePresence(aiSections ?? { headline, body }, {
    name: leaderName,
    handle: leaderHandle,
  })

  return composeTweet({
    headline: sections.headline,
    body: sections.body,
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

export function extractTwitterHandle(value?: string | null): string | null {
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
