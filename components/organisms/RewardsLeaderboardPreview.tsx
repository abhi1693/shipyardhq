import Link from "next/link"

import { DirectorySectionHeader } from "@/components/molecules/directory/SectionHeader"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { cn } from "@/lib/utils"
import { LEADERBOARD_REWARDS_PATH, userPath } from "@/lib/routes"
import type { RewardsLeaderboardDisplayEntry } from "@/lib/rewards/display"

const numberFormatter = new Intl.NumberFormat("en-US")

const formatNumber = (value: number) => numberFormatter.format(value)

const formatRewards = (value: number) => `${formatNumber(value)} rewards`

const formatLaunches = (count: number) => {
  if (count === 1) return "1 launch shipped"
  return `${formatNumber(count)} launches shipped`
}

type RewardsLeaderboardPreviewProps = {
  entries: RewardsLeaderboardDisplayEntry[]
}

export function RewardsLeaderboardPreview({
  entries,
}: RewardsLeaderboardPreviewProps) {
  if (!entries.length) return null

  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
      <DirectorySectionHeader
        kicker="Rewards spotlight"
        title="Top Shipyard members leading the rewards board"
        description="Builders earn rewards for powering Shipyard—through reviews, verified traction, and consistent launch streaks. These members hold the top spots today."
        action={
          <Link
            href={LEADERBOARD_REWARDS_PATH}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View rewards leaderboard
          </Link>
        }
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {entries.slice(0, 3).map((entry, index) => (
          <li key={entry.userId} className="h-full">
            <LeaderboardMemberRow entry={entry} rank={index + 1} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function LeaderboardMemberRow({
  entry,
  rank,
}: {
  entry: RewardsLeaderboardDisplayEntry
  rank: number
}) {
  const highlight = rank === 1
  const avatarSize = highlight ? 48 : 44

  return (
    <Link
      href={userPath(entry.userId)}
      className={cn(
        "group flex h-full flex-col gap-4 rounded-2xl border border-border/70 bg-white/85 p-5 shadow-sm shadow-black/5 transition-transform duration-200 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.26]",
        highlight
          ? "border-[color:var(--brand-1)/0.35] bg-[radial-gradient(120%_120%_at_90%_0%,var(--brand-1)/0.12,transparent_60%),radial-gradient(120%_120%_at_0%_100%,var(--brand-2)/0.12,transparent_70%)]"
          : "",
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[color:var(--brand-1)/0.28] bg-[color:var(--brand-1)/0.08] px-3 text-sm font-semibold text-[color:var(--brand-1)]",
            highlight ? "h-10 min-w-10 text-base" : "",
          )}
        >
          #{rank}
        </span>
        <Avatar
          className={cn(
            "h-11 w-11 bg-muted/60 text-sm font-semibold text-foreground shadow-[0_18px_40px_-32px_rgba(7,58,104,0.6)] transition-transform duration-200",
            highlight ? "h-12 w-12 text-base" : "",
          )}
        >
          {entry.avatarUrl ? (
            <AvatarImage
              src={entry.avatarUrl}
              alt={entry.displayName}
              width={avatarSize}
              height={avatarSize}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback>{entry.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {entry.displayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatLaunches(entry.launchCount)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1 text-sm">
        <p className="font-semibold text-foreground">
          {formatRewards(entry.lifetimeEarned)}
        </p>
        <p className="text-xs text-muted-foreground">
          Balance · {formatRewards(entry.balance)}
        </p>
      </div>
    </Link>
  )
}

export default RewardsLeaderboardPreview
