"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { Switch } from "@/components/atoms/switch"
import { Input } from "@/components/atoms/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/atoms/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { ScrollArea } from "@/components/atoms/scroll-area"
import { cn } from "@/lib/utils"

type UseCase = { id: string; slug: string; label: string }
type Category = { id: string; slug: string; name: string }

interface BrowseFilterBarProps {
  useCases: UseCase[]
  categories: Category[]
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

export default function BrowseFilterBar({
  useCases,
  categories,
  current,
}: BrowseFilterBarProps) {
  const router = useRouter()
  const params = useSearchParams()

  const [ucQuery, setUcQuery] = useState("")
  const [catQuery, setCatQuery] = useState("")

  const filteredUseCases = useMemo(() => {
    const q = ucQuery.trim().toLowerCase()
    return useCases.filter((u) => u.label.toLowerCase().includes(q))
  }, [useCases, ucQuery])

  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, catQuery])

  const buildUrl = useCallback(
    (key: string, value: string | boolean | undefined) => {
      const url = new URLSearchParams(
        Object.fromEntries(
          [...params.entries()].filter(([_, v]) => typeof v === "string"),
        ),
      )
      if (value === undefined || value === "__all__" || value === false) {
        url.delete(key)
      } else {
        url.set(key, String(value))
      }
      url.set("page", "1")
      return `/browse?${url.toString()}`
    },
    [params],
  )

  const hasActiveFilters =
    (!!current.useCase && current.useCase !== "__all__") ||
    (!!current.category && current.category !== "__all__") ||
    !!current.verified ||
    (current.sort && current.sort !== "new")

  const currentUseCaseLabel = useCases.find((u) => u.slug === current.useCase)?.label
  const currentCategoryLabel = categories.find((c) => c.slug === current.category)?.name

  return (
    <div className="sticky top-24 z-20 rounded-lg border bg-card/80 backdrop-blur px-3 py-2 md:px-4 md:py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Use Case */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[9rem] justify-between">
              <span className="truncate">
                {currentUseCaseLabel ?? "Use Case"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2">
            <DropdownMenuLabel>Use Case</DropdownMenuLabel>
            <div className="px-1 pb-2">
              <Input
                placeholder="Search use cases"
                value={ucQuery}
                onChange={(e) => setUcQuery(e.target.value)}
                className="h-8"
              />
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-64">
              <div className="p-1 space-y-1">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); router.push(buildUrl("useCase", "__all__")) }}>
                  All Use Cases
                </DropdownMenuItem>
                {filteredUseCases.map((uc) => (
                  <DropdownMenuItem
                    key={uc.id}
                    onSelect={(e) => {
                      e.preventDefault()
                      router.push(buildUrl("useCase", uc.slug))
                    }}
                  >
                    {uc.label}
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[9rem] justify-between">
              <span className="truncate">
                {currentCategoryLabel ?? "Category"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2">
            <DropdownMenuLabel>Category</DropdownMenuLabel>
            <div className="px-1 pb-2">
              <Input
                placeholder="Search categories"
                value={catQuery}
                onChange={(e) => setCatQuery(e.target.value)}
                className="h-8"
              />
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-64">
              <div className="p-1 space-y-1">
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); router.push(buildUrl("category", "__all__")) }}>
                  All Categories
                </DropdownMenuItem>
                {filteredCategories.map((cat) => (
                  <DropdownMenuItem
                    key={cat.id}
                    onSelect={(e) => {
                      e.preventDefault()
                      router.push(buildUrl("category", cat.slug))
                    }}
                  >
                    {cat.name}
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <Select
          value={current.sort ?? "new"}
          onValueChange={(val) => router.push(buildUrl("sort", val))}
        >
          <SelectTrigger size="sm" className="min-w-[9rem]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Verified */}
        <div className="ml-auto md:ml-0 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
          <span className="text-xs md:text-sm">Verified only</span>
          <Switch
            checked={Boolean(current.verified)}
            onCheckedChange={(checked) => router.push(buildUrl("verified", checked))}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/browse")}
            className="ml-auto"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}

