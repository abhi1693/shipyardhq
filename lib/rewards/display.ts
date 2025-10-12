import type { RewardsLeaderboardEntry } from "@/actions/public/rewards/actions"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"

export type RewardsLeaderboardDisplayEntry = RewardsLeaderboardEntry & {
  displayName: string
  initials: string
  avatarUrl: string | null
  launchCount: number
}

export function resolveRewardsLeaderboardEntryMeta(
  entry: RewardsLeaderboardEntry,
): {
  displayName: string
  initials: string
  launchCount: number
} {
  const first = entry.user?.firstName?.trim() ?? ""
  const last = entry.user?.lastName?.trim() ?? ""
  const displayName = `${first} ${last}`.trim() || "Shipyard member"

  const initialsSource = displayName.split(/\s+/).slice(0, 2)
  const initials =
    initialsSource
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "SY"

  const launchCount = entry.user?._count.products ?? 0

  return {
    displayName,
    initials,
    launchCount,
  }
}

export async function hydrateRewardsLeaderboardEntry(
  entry: RewardsLeaderboardEntry,
): Promise<RewardsLeaderboardDisplayEntry> {
  const { displayName, initials, launchCount } =
    resolveRewardsLeaderboardEntryMeta(entry)

  const clerkId = entry.user?.clerkId
  let avatarUrl: string | null = null

  if (clerkId) {
    try {
      const clerkUser = await getClerkUserByIdCached(clerkId)
      avatarUrl = clerkUser.imageUrl ?? null
    } catch {
      avatarUrl = null
    }
  }

  return {
    ...entry,
    displayName,
    initials,
    launchCount,
    avatarUrl,
  }
}

export async function hydrateRewardsLeaderboardEntries(
  entries: RewardsLeaderboardEntry[],
): Promise<RewardsLeaderboardDisplayEntry[]> {
  return Promise.all(entries.map(hydrateRewardsLeaderboardEntry))
}
