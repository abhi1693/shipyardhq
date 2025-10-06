"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/atoms/button"
import Link from "next/link"
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
import InlineSelect from "@/components/molecules/InlineSelect"
import { ScrollArea } from "@/components/atoms/scroll-area"
import { buildQuery } from "@/lib/urlParams"
import { BROWSE_PATH } from "@/lib/routes"

type UseCase = {
  id: string
  slug: string
  label: string
  productCount?: number
}
type Category = {
  id: string
  slug: string
  name: string
  _count?: { products: number }
}

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
  const qs = params?.toString() ?? ""
  const [q, setQ] = useState("")

  useEffect(() => {
    const nextQ = params?.get("q") ?? ""
    setQ(nextQ)
  }, [params])

  // Debounced apply of search param when typing
  useEffect(() => {
    const currentQ = params?.get("q") ?? ""
    const trimmed = (q || "").trim()
    if (trimmed === currentQ) return
    const t = setTimeout(() => {
      router.push(
        buildQuery(BROWSE_PATH, qs, { q: trimmed || undefined, page: "1" }),
      )
    }, 400)
    return () => clearTimeout(t)
  }, [q, params, qs, router])
  // Simple lists (search removed for now)
  const buildUrl = useCallback(
    (key: string, value: string | boolean | undefined) => {
      return buildQuery(BROWSE_PATH, qs, {
        [key]:
          /* c8 ignore next */ value === undefined ||
          value === "__all__" ||
          value === false
            ? undefined
            : String(value),
        page: "1",
      })
    },
    [qs],
  )

  const buildUrlMulti = useCallback(
    (
      overrides: Partial<{
        useCase: string | boolean | undefined
        category: string | boolean | undefined
        sort: string | undefined
        verified: boolean | undefined
      }>,
    ) => {
      const updates: Record<string, string | undefined> = { page: "1" }
      if ("useCase" in overrides) {
        const v = overrides.useCase
        updates.useCase =
          v === undefined || v === "__all__" || v === false
            ? undefined
            : String(v)
      }
      if ("category" in overrides) {
        const v = overrides.category
        updates.category =
          v === undefined || v === "__all__" || v === false
            ? undefined
            : String(v)
      }
      /* c8 ignore next 3: currently unused in UI; kept for future */
      if ("sort" in overrides) {
        updates.sort = overrides.sort ?? undefined
      }
      /* c8 ignore next 4: currently unused in UI; kept for future */
      if ("verified" in overrides) {
        const v = overrides.verified
        updates.verified = v ? "true" : undefined
      }
      return buildQuery(BROWSE_PATH, qs, updates)
    },
    [qs],
  )

  const hasActiveFilters =
    (!!current.useCase && current.useCase !== "__all__") ||
    (!!current.category && current.category !== "__all__") ||
    !!current.verified ||
    Boolean((params?.get("q") ?? "").trim()) ||
    (current.sort && current.sort !== "new")

  const currentUseCaseLabel = useCases.find(
    (u) => u.slug === current.useCase,
  )?.label
  const currentCategoryLabel = categories.find(
    (c) => c.slug === current.category,
  )?.name
  const hasUseCaseActive = Boolean(
    current.useCase && current.useCase !== "__all__",
  )
  const hasCategoryActive = Boolean(
    current.category && current.category !== "__all__",
  )

  return (
    <div className="rounded-lg border bg-card/80 backdrop-blur px-3 py-2 md:px-4 md:py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="w-full sm:w-auto sm:min-w-[14rem]">
          <div className="relative">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                }
              }}
              placeholder="Search products"
              className="h-8 pr-8"
              data-testid="browse-search"
            />
            {q ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setQ("")
                  router.push(
                    buildQuery(BROWSE_PATH, qs, { q: undefined, page: "1" }),
                  )
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {/* Use Case */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[9rem] justify-between"
              disabled={hasCategoryActive}
              title={
                hasCategoryActive
                  ? "Use Case disabled when Category is selected"
                  : undefined
              }
              data-testid="filter-use-case-trigger"
            >
              <span className="truncate">
                {currentUseCaseLabel ?? "Use Case"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2">
            <DropdownMenuLabel>Use Case</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-64">
              <div className="p-1 space-y-1">
                <DropdownMenuItem asChild>
                  <Link href={buildUrlMulti({ useCase: "__all__" })}>
                    All Use Cases
                  </Link>
                </DropdownMenuItem>
                {useCases.map((uc) => (
                  <DropdownMenuItem key={uc.id} asChild>
                    <Link
                      href={buildUrlMulti({
                        useCase: uc.slug,
                        category: "__all__",
                      })}
                      data-testid={`use-case-option-${uc.slug}`}
                    >
                      {uc.label}
                      {typeof uc.productCount === "number" && (
                        <span className="ml-1 text-muted-foreground">
                          ({uc.productCount})
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[9rem] justify-between"
              disabled={hasUseCaseActive}
              title={
                hasUseCaseActive
                  ? "Category disabled when Use Case is selected"
                  : undefined
              }
              data-testid="filter-category-trigger"
            >
              <span className="truncate">
                {currentCategoryLabel ?? "Category"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2">
            <DropdownMenuLabel>Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-64">
              <div className="p-1 space-y-1">
                <DropdownMenuItem asChild>
                  <Link href={buildUrlMulti({ category: "__all__" })}>
                    All Categories
                  </Link>
                </DropdownMenuItem>
                {categories.map((cat) => (
                  <DropdownMenuItem key={cat.id} asChild>
                    <Link
                      href={buildUrlMulti({
                        category: cat.slug,
                        useCase: "__all__",
                      })}
                      data-testid={`category-option-${cat.slug}`}
                    >
                      {cat.name}
                      {typeof cat._count?.products === "number" && (
                        <span className="ml-1 text-muted-foreground">
                          ({cat._count.products})
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <InlineSelect
          value={current.sort ?? "new"}
          onValueChange={(val) => router.push(buildUrl("sort", val))}
          placeholder="Sort"
          options={sortOptions}
          triggerClassName="h-8 min-w-[9rem]"
        />

        {/* Verified */}
        <div className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
          <span className="text-xs md:text-sm">Verified only</span>
          <Switch
            checked={Boolean(current.verified)}
            onCheckedChange={(checked) =>
              router.push(
                buildQuery(BROWSE_PATH, qs, {
                  verified: checked ? "true" : undefined,
                  page: "1",
                }),
              )
            }
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(BROWSE_PATH)}
            className="ml-auto"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}
