const MAX_SNIPPET_LENGTH = 480

function truncate(value: string, limit = MAX_SNIPPET_LENGTH) {
  if (value.length <= limit) return value
  const slice = value.slice(0, limit - 1).replace(/\s+$/g, "")
  return `${slice}…`
}

export function extractLinkedInHandle(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.length) return null

  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/([A-Za-z0-9_.-]+)/i,
  )
  if (urlMatch?.[1]) {
    return urlMatch[1]
  }

  const direct = trimmed.replace(/^@/, "")
  return direct.length ? direct : null
}

function formatHandle(handle?: string | null) {
  const normalized = handle?.trim()
  if (!normalized) return null
  return normalized.startsWith("@") ? normalized.slice(1) : normalized
}

export async function buildLinkedInProductLaunchPost(args: {
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  twitterHandle?: string | null
}) {
  const handle = formatHandle(args.twitterHandle)
  const lines: Array<string | null | undefined> = [
    `${args.name} just launched on Shipyard HQ.`,
    args.tagline?.trim(),
    args.description ? truncate(args.description.trim()) : null,
    handle ? `Connect with the team: ${handle}` : null,
    `Take a look: ${args.url}`,
  ]

  return lines
    .filter((line): line is string => Boolean(line))
    .join("\n\n")
}

const BADGE_COPY: Record<
  "featured" | "trending" | "editor-pick",
  { headline: (name: string) => string; note?: string }
> = {
  featured: {
    headline: (name) => `${name} just earned a Featured spotlight on Shipyard HQ.`,
    note: "We highlight the most compelling launches for our community.",
  },
  trending: {
    headline: (name) => `${name} is trending on Shipyard HQ.`,
    note: "Momentum is building fast—check out why the community is excited.",
  },
  "editor-pick": {
    headline: (name) => `${name} was selected as an editor's pick on Shipyard HQ.`,
  },
}

export async function buildLinkedInBadgePost(args: {
  badge: string
  name: string
  tagline?: string | null
  description?: string | null
  url: string
  twitterHandle?: string | null
}) {
  if (!Object.prototype.hasOwnProperty.call(BADGE_COPY, args.badge)) {
    return null
  }

  const copy = BADGE_COPY[args.badge as keyof typeof BADGE_COPY]
  const handle = formatHandle(args.twitterHandle)

  const lines: Array<string | null | undefined> = [
    copy.headline(args.name),
    args.tagline?.trim(),
    copy.note,
    handle ? `Connect with the team: ${handle}` : null,
    `See more: ${args.url}`,
  ]

  return lines
    .filter((line): line is string => Boolean(line))
    .join("\n\n")
}

export async function buildLinkedInLeaderboardPost(args: {
  monthLabel: string
  leaderboardUrl: string
  winners: Array<{ rank: number; name: string; twitterHandle?: string | null }>
}) {
  const sorted = [...args.winners].sort((a, b) => a.rank - b.rank)
  const intro =
    sorted.length > 0
      ? `Celebrating the ${args.monthLabel} Shipyard HQ leaderboard winners.`
      : `Celebrating builders from ${args.monthLabel} on Shipyard HQ.`

  const topWinners = sorted.slice(0, 5).map((winner) => {
    const handle = formatHandle(winner.twitterHandle)
    return handle
      ? `${winner.rank}. ${winner.name} (${handle})`
      : `${winner.rank}. ${winner.name}`
  })

  const lines: Array<string | null | undefined> = [
    intro,
    topWinners.length ? ["Top builders:", ...topWinners].join("\n") : null,
    `Full board: ${args.leaderboardUrl}`,
  ]

  return lines
    .filter((line): line is string => Boolean(line))
    .join("\n\n")
}
