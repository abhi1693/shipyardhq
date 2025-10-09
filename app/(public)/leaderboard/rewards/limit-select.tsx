"use client"

import { useRouter, useSearchParams } from "next/navigation"

import InlineSelect from "@/components/molecules/InlineSelect"
import { buildQuery } from "@/lib/urlParams"
import { LEADERBOARD_REWARDS_PATH } from "@/lib/routes"
import {
  REWARDS_LEADERBOARD_DEFAULT_LIMIT,
  normalizeRewardsLeaderboardLimit,
} from "@/lib/rewards/leaderboard"

const LIMIT_OPTIONS = [10, 25, 50, 100, 200]

export function RewardLeaderboardLimitSelect({ limit }: { limit: number }) {
  const router = useRouter()
  const search = useSearchParams()

  const handleChange = (value: string) => {
    const nextLimit = normalizeRewardsLeaderboardLimit(Number(value))
    const isDefault = nextLimit === REWARDS_LEADERBOARD_DEFAULT_LIMIT

    router.push(
      buildQuery(
        LEADERBOARD_REWARDS_PATH,
        search?.toString() ?? "",
        isDefault ? { limit: undefined } : { limit: String(nextLimit) },
      ),
    )
  }

  return (
    <InlineSelect
      value={String(normalizeRewardsLeaderboardLimit(limit))}
      onValueChange={handleChange}
      options={LIMIT_OPTIONS.map((option) => ({
        value: String(option),
        label: `Top ${option}`,
      }))}
      triggerClassName="h-10 w-full rounded-full"
      testId="rewards-leaderboard-limit-select"
      dropdownTestId="rewards-leaderboard-limit-dropdown"
    />
  )
}
