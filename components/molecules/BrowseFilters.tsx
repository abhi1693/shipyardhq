"use client"

import { useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/atoms/switch"

interface BrowseFiltersProps {
  useCases: { id: string; slug: string; label: string }[]
  categories: { id: string; slug: string; name: string }[]
  current: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
  }
}

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "votes", label: "Most Upvoted" },
  { value: "az", label: "A–Z" },
]

export default function BrowseFilters({
  useCases,
  categories,
  current,
}: BrowseFiltersProps) {
  const params = useSearchParams()
  const router = useRouter()

  const buildUrl = useCallback(
    (key: string, value: string | boolean) => {
      const url = new URLSearchParams(
        Object.fromEntries(
          [...params.entries()].filter(([_, v]) => typeof v === "string"),
        ),
      )
      if (value === "__all__" || value === false) {
        url.delete(key)
      } else {
        url.set(key, String(value))
      }
      url.set("page", "1")
      return `/browse?${url.toString()}`
    },
    [params],
  )

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto">
      <div>
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground mb-2">Use Case</h4>
        <ul className="space-y-1">
          {[
            { id: "__all__", slug: "__all__", label: "All Use Cases" },
            ...useCases,
          ].map((uc) => (
            <li key={uc.id}>
              <Link
                href={buildUrl("useCase", uc.slug)}
                className={cn(
                  "block text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                  current.useCase === uc.slug ||
                    (!current.useCase && uc.slug === "__all__")
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                {uc.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground mb-2">Category</h4>
        <ul className="space-y-1">
          {[
            { id: "__all__", slug: "__all__", name: "All Categories" },
            ...categories,
          ].map((cat) => (
            <li key={cat.id}>
              <Link
                href={buildUrl("category", cat.slug)}
                className={cn(
                  "block text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                  current.category === cat.slug ||
                    (!current.category && cat.slug === "__all__")
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground mb-2">Sort By</h4>
        <ul className="space-y-1">
          {sortOptions.map((opt) => (
            <li key={opt.value}>
              <Link
                href={buildUrl("sort", opt.value)}
                className={cn(
                  "block text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                  current.sort === opt.value
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                {opt.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground mb-2">Verified Only</h4>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">Only show verified</span>
          <Switch
            checked={Boolean(current.verified)}
            onCheckedChange={(checked) => router.push(buildUrl("verified", checked))}
            aria-label="Toggle verified only"
          />
        </div>
      </div>
    </aside>
  )
}
