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
    <div className="grid gap-3 sm:grid-cols-2">
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
        triggerClassName="h-10 w-full rounded-full"
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
        triggerClassName="h-10 w-full rounded-full"
        testId="leaderboard-limit-select"
        dropdownTestId="leaderboard-limit-dropdown"
      />
    </div>
  )
}
