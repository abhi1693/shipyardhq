"use client"

import { useRouter, useSearchParams } from "next/navigation"
import InlineSelect from "@/components/molecules/InlineSelect"
import { buildQuery } from "@/lib/urlParams"
import { LEADERBOARD_PATH } from "@/lib/routes"

export function LeaderboardFilters({
  categories,
  selected,
  limit,
}: {
  categories: { id: string; name: string; slug: string }[]
  selected?: string
  limit: number
}) {
  const router = useRouter()
  const search = useSearchParams()

  const updateQuery = (updates: Record<string, string | undefined>) => {
    router.push(buildQuery(LEADERBOARD_PATH, search?.toString() ?? "", updates))
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-1)]">
          Tune the tides
        </p>
        <p className="text-xs text-muted-foreground">
          Filter by category or adjust how many captains you track.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <InlineSelect
          value={selected || "all"}
          onValueChange={(v) =>
            updateQuery({ category: v === "all" ? undefined : v })
          }
          placeholder="All categories"
          options={[
            { value: "all", label: "All categories" },
            ...categories.map((c) => ({ value: c.slug, label: c.name })),
          ]}
          triggerClassName="h-9 w-[200px]"
          testId="leaderboard-category-select"
          dropdownTestId="leaderboard-category-dropdown"
        />

        <InlineSelect
          value={String(limit)}
          onValueChange={(v) => updateQuery({ limit: v })}
          options={[10, 25, 50, 100].map((n) => ({
            value: String(n),
            label: `Top ${n}`,
          }))}
          triggerClassName="h-9 w-[140px]"
          testId="leaderboard-limit-select"
          dropdownTestId="leaderboard-limit-dropdown"
        />
      </div>
    </div>
  )
}
