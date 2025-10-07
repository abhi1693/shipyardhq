"use client"

import { useCallback, useEffect, useId, useState } from "react"
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
import { Label } from "@/components/atoms/label"

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

  const setVerified = useCallback(
    (next: boolean) => {
      router.push(
        buildQuery(BROWSE_PATH, qs, {
          verified: next ? "true" : undefined,
          page: "1",
        }),
      )
    },
    [qs, router],
  )

  const verifiedSwitchId = useId()
  const verifiedActive = Boolean(current.verified)

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
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/95 px-4 py-4 shadow-[0_20px_60px_-40px_rgba(7,58,104,0.45)] backdrop-blur dark:border-border/40 dark:bg-slate-950/75">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="w-full sm:w-auto sm:min-w-[17rem]">
          <div className="relative flex h-9 items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 text-sm text-foreground shadow-sm dark:border-border/40 dark:bg-slate-950/60">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[color:var(--brand-1)] shadow-inner">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="6" />
                <line x1="20" y1="20" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                }
              }}
              placeholder="Search the directory"
              className="h-full flex-1 border-none bg-transparent pl-0 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              data-testid="browse-search"
            />
            {q ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[color:var(--brand-1)/0.15] px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-1)] transition hover:bg-[color:var(--brand-1)/0.22]"
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
              className="min-w-[9rem] justify-between rounded-full border border-border/60 bg-background/95 text-sm font-medium text-muted-foreground shadow-sm transition hover:border-border hover:text-foreground dark:border-border/40 dark:bg-slate-950/60"
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
          <DropdownMenuContent className="w-64 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-xl shadow-[rgba(7,58,104,0.18)] dark:border-border/40 dark:bg-slate-950/85">
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
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm"
                    >
                      <span>{uc.label}</span>
                      {typeof uc.productCount === "number" && (
                        <span className="ml-2 rounded-full bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-1)]">
                          {uc.productCount}
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
              className="min-w-[9rem] justify-between rounded-full border border-border/60 bg-background/95 text-sm font-medium text-muted-foreground shadow-sm transition hover:border-border hover:text-foreground dark:border-border/40 dark:bg-slate-950/60"
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
          <DropdownMenuContent className="w-64 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-xl shadow-[rgba(7,58,104,0.18)] dark:border-border/40 dark:bg-slate-950/85">
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
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm"
                    >
                      <span>{cat.name}</span>
                      {typeof cat._count?.products === "number" && (
                        <span className="ml-2 rounded-full bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-1)]">
                          {cat._count.products}
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
          triggerClassName="h-8 min-w-[9rem] cursor-pointer rounded-full border border-border/60 bg-background/95 text-sm font-medium text-muted-foreground shadow-sm transition hover:border-border hover:bg-muted/60 hover:text-foreground dark:border-border/40 dark:bg-slate-950/60"
        />

        {/* Verified */}
        <Label
          htmlFor={verifiedSwitchId}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-border hover:bg-muted/60 md:text-sm dark:border-border/40 dark:bg-slate-950/60"
        >
          <span className="select-none">Verified only</span>
          <Switch
            id={verifiedSwitchId}
            checked={verifiedActive}
            onCheckedChange={(checked) => setVerified(checked)}
          />
        </Label>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(BROWSE_PATH)}
            className="ml-auto rounded-full border border-border/60 bg-background/95 px-4 py-1.5 text-sm font-semibold text-[color:var(--brand-1)] shadow-sm transition hover:border-border hover:bg-muted/60 dark:border-border/40 dark:bg-slate-950/60"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  )
}
