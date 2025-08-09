"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/atoms/switch"
import { Input } from "@/components/atoms/input"

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
  const [ucQuery, setUcQuery] = useState("")
  const [catQuery, setCatQuery] = useState("")
  const [ucExpanded, setUcExpanded] = useState(false)
  const [catExpanded, setCatExpanded] = useState(false)

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

  const filteredUseCases = useMemo(() => {
    const q = ucQuery.trim().toLowerCase()
    const items = useCases.filter((u) => u.label.toLowerCase().includes(q))
    return items
  }, [useCases, ucQuery])

  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase()
    const items = categories.filter((c) => c.name.toLowerCase().includes(q))
    return items
  }, [categories, catQuery])

  const ucVisible = ucExpanded ? filteredUseCases : filteredUseCases.slice(0, 8)
  const catVisible = catExpanded
    ? filteredCategories
    : filteredCategories.slice(0, 8)

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
          Use Case
        </h4>
        <div className="mt-3">
          <Input
            placeholder="Search use cases"
            value={ucQuery}
            onChange={(e) => setUcQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ul className="mt-3 space-y-1">
          <li>
            <Link
              href={buildUrl("useCase", "__all__")}
              className={cn(
                "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                !current.useCase
                  ? "bg-muted font-medium"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  !current.useCase
                    ? "bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                    : "bg-border",
                )}
              />
              All Use Cases
            </Link>
          </li>
          {ucVisible.map((uc) => (
            <li key={uc.id}>
              <Link
                href={buildUrl("useCase", uc.slug)}
                className={cn(
                  "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                  current.useCase === uc.slug
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    current.useCase === uc.slug
                      ? "bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                      : "bg-border",
                  )}
                />
                {uc.label}
              </Link>
            </li>
          ))}
        </ul>
        {filteredUseCases.length > 8 && (
          <button
            type="button"
            onClick={() => setUcExpanded((v) => !v)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {ucExpanded
              ? "Show less"
              : `Show more (${filteredUseCases.length - 8})`}
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
          Category
        </h4>
        <div className="mt-3">
          <Input
            placeholder="Search categories"
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <ul className="mt-3 space-y-1">
          <li>
            <Link
              href={buildUrl("category", "__all__")}
              className={cn(
                "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                !current.category
                  ? "bg-muted font-medium"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  !current.category
                    ? "bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                    : "bg-border",
                )}
              />
              All Categories
            </Link>
          </li>
          {catVisible.map((cat) => (
            <li key={cat.id}>
              <Link
                href={buildUrl("category", cat.slug)}
                className={cn(
                  "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                  current.category === cat.slug
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    current.category === cat.slug
                      ? "bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                      : "bg-border",
                  )}
                />
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
        {filteredCategories.length > 8 && (
          <button
            type="button"
            onClick={() => setCatExpanded((v) => !v)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {catExpanded
              ? "Show less"
              : `Show more (${filteredCategories.length - 8})`}
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
          Sort By
        </h4>
        <ul className="mt-3 space-y-1">
          {sortOptions.map((opt) => (
            <li key={opt.value}>
              <Link
                href={buildUrl("sort", opt.value)}
                className={cn(
                  "flex items-center gap-2 text-sm rounded-md px-3 py-1.5 hover:bg-muted",
                  current.sort === opt.value
                    ? "bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    current.sort === opt.value
                      ? "bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                      : "bg-border",
                  )}
                />
                {opt.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h4 className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
          Verified Only
        </h4>
        <div className="mt-3 flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">Only show verified</span>
          <Switch
            checked={Boolean(current.verified)}
            onCheckedChange={(checked) =>
              router.push(buildUrl("verified", checked))
            }
            aria-label="Toggle verified only"
          />
        </div>
      </div>
    </aside>
  )
}
