"use client"

import { useRouter, useSearchParams } from "next/navigation"
import InlineSelect from "@/components/molecules/InlineSelect"
import { buildQuery } from "@/lib/urlParams"

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
    router.push(
      buildQuery("/leaderboard", search?.toString() ?? "", updates),
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <div className="text-sm text-muted-foreground">Filter</div>
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
        triggerClassName="h-8 w-[200px]"
      />

      <div className="text-sm text-muted-foreground">Show</div>
      <InlineSelect
        value={String(limit)}
        onValueChange={(v) => updateQuery({ limit: v })}
        options={[10, 25, 50, 100].map((n) => ({
          value: String(n),
          label: `Top ${n}`,
        }))}
        triggerClassName="h-8 w-[120px]"
      />
    </div>
  )
}
