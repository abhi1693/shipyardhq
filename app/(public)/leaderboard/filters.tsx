"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"

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
    const params = new URLSearchParams(search.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) params.delete(k)
      else params.set(k, v)
    })
    router.push(`/leaderboard?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <div className="text-sm text-muted-foreground">Filter</div>
      <Select
        value={selected || "all"}
        onValueChange={(v) =>
          updateQuery({ category: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="h-8 w-[200px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.slug}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="text-sm text-muted-foreground">Show</div>
      <Select
        value={String(limit)}
        onValueChange={(v) => updateQuery({ limit: v })}
      >
        <SelectTrigger className="h-8 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[10, 25, 50, 100].map((n) => (
            <SelectItem key={n} value={String(n)}>
              Top {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

