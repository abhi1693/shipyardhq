"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/atoms/select"
import { Switch } from "@/components/atoms/switch"
import { Label } from "@/components/atoms/label"

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

export default function BrowseFilters({
  useCases,
  categories,
  current,
}: BrowseFiltersProps) {
  const router = useRouter()
  const params = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string | boolean | undefined) => {
      const search = new URLSearchParams(params.toString())

      if (value === undefined || value === false || value === "__all__") {
        search.delete(key)
      } else {
        search.set(key, String(value))
      }

      search.set("page", "1")
      router.push(`/browse?${search.toString()}`, { scroll: false })
    },
    [params, router],
  )

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* Use Case */}
      <div>
        <Label className="mb-1 block">Use Case</Label>
        <Select
          value={current.useCase || "__all__"}
          onValueChange={(val) => updateParam("useCase", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Use Cases" />
          </SelectTrigger>
          <SelectContent>
            {useCases.map((uc) => (
              <SelectItem key={uc.id} value={uc.slug}>
                {uc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div>
        <Label className="mb-1 block">Category</Label>
        <Select
          value={current.category || "__all__"}
          onValueChange={(val) => updateParam("category", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div>
        <Label className="mb-1 block">Sort By</Label>
        <Select
          value={current.sort || "new"}
          onValueChange={(val) => updateParam("sort", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Newest</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="votes">Most Upvoted</SelectItem>
            <SelectItem value="az">A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Verified */}
      <div className="flex flex-col justify-end gap-2 pt-6">
        <div className="flex items-center gap-3">
          <Switch
            checked={current.verified}
            onCheckedChange={(val) => updateParam("verified", val)}
          />
          <Label>Verified Only</Label>
        </div>
      </div>
    </div>
  )
}
