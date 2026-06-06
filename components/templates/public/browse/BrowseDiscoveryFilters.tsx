"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Check,
  Clock3,
  ListFilter,
  Search,
  ShieldCheck,
  Tags,
  TrendingUp,
  Trophy,
} from "lucide-react"

import type { BrowseSort } from "@/lib/browse/cache"
import { BROWSE_PATH, tagPath } from "@/lib/routes"
import { buildQuery } from "@/lib/urlParams"

type BrowseFilterCategory = {
  slug: string
  name: string
  _count?: { products?: number | null } | null
}

type BrowseFilterUseCase = {
  slug: string
  label: string
  productCount: number
}

interface BrowseDiscoveryFiltersProps {
  categories: BrowseFilterCategory[]
  useCases: BrowseFilterUseCase[]
  current: {
    useCase?: string
    category?: string
    sort: BrowseSort
    verified: boolean
    query?: string
  }
  hasActiveFilters: boolean
}

const sortOptions: Array<{
  value: BrowseSort
  label: string
  Icon: typeof TrendingUp
}> = [
  { value: "trending", label: "Trending", Icon: TrendingUp },
  { value: "votes", label: "Most Upvoted", Icon: Trophy },
  { value: "new", label: "Newest", Icon: Clock3 },
]

const tagLinks = [
  { label: "Automation", slug: "automation" },
  { label: "Cloud Native", slug: "cloud-native" },
  { label: "DevOps", slug: "devops" },
  { label: "Serverless", slug: "serverless" },
]

export function BrowseDiscoveryFilters({
  categories,
  useCases,
  current,
  hasActiveFilters,
}: BrowseDiscoveryFiltersProps) {
  const searchParams = useSearchParams()
  const [categoryQuery, setCategoryQuery] = useState("")
  const [useCaseQuery, setUseCaseQuery] = useState("")

  const qs = searchParams.toString()

  const filteredCategories = useMemo(() => {
    const needle = categoryQuery.trim().toLowerCase()
    return categories
      .filter((item) => !needle || item.name.toLowerCase().includes(needle))
      .slice(0, 10)
  }, [categories, categoryQuery])

  const filteredUseCases = useMemo(() => {
    const needle = useCaseQuery.trim().toLowerCase()
    return useCases
      .filter((item) => !needle || item.label.toLowerCase().includes(needle))
      .slice(0, 8)
  }, [useCases, useCaseQuery])

  const filterHref = (
    updates: Record<string, string | undefined | null | false>,
  ) => buildQuery(BROWSE_PATH, qs, { ...updates, page: undefined })

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <section className="rounded-lg border border-[#e2e8f0] bg-white p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#43474c]">
            <ListFilter className="h-4 w-4 text-[#10b981]" aria-hidden />
            Filters
          </h2>
          {hasActiveFilters ? (
            <Link
              href={BROWSE_PATH}
              className="text-xs font-bold text-[#0051d5] underline-offset-4 hover:underline"
            >
              Reset
            </Link>
          ) : null}
        </div>

        <div className="space-y-7">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
                Categories
              </h3>
              <span className="text-[10px] font-black text-[#10b981]">
                {categories.length.toLocaleString("en-US")} total
              </span>
            </div>
            <label className="relative block">
              <span className="sr-only">Search categories</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74777d]"
                aria-hidden
              />
              <input
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                className="h-10 w-full rounded-md border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 text-sm focus:border-[#10b981] focus:ring-[#10b981]"
                placeholder="Search categories..."
                type="search"
              />
            </label>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {filteredCategories.map((item) => {
                const active = current.category === item.slug
                const count = item._count?.products ?? 0
                return (
                  <Link
                    key={item.slug}
                    href={filterHref({
                      category: active ? undefined : item.slug,
                      useCase: undefined,
                    })}
                    className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 transition hover:bg-[#f8fafc]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={
                          active
                            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#10b981] bg-[#10b981] text-white"
                            : "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#e2e8f0]"
                        }
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span
                        className={
                          active
                            ? "truncate text-sm font-semibold text-[#061d31]"
                            : "truncate text-sm font-medium text-[#43474c]"
                        }
                      >
                        {item.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-[#74777d]">
                      {count.toLocaleString("en-US")}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
                Use Cases
              </h3>
              <span className="text-[10px] font-black text-[#10b981]">
                {useCases.length.toLocaleString("en-US")} total
              </span>
            </div>
            <label className="relative block">
              <span className="sr-only">Search use cases</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74777d]"
                aria-hidden
              />
              <input
                value={useCaseQuery}
                onChange={(event) => setUseCaseQuery(event.target.value)}
                className="h-10 w-full rounded-md border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 text-sm focus:border-[#10b981] focus:ring-[#10b981]"
                placeholder="Search use cases..."
                type="search"
              />
            </label>
            <div className="mt-3 space-y-2">
              {filteredUseCases.map((item) => {
                const active = current.useCase === item.slug
                return (
                  <Link
                    key={item.slug}
                    href={filterHref({
                      useCase: active ? undefined : item.slug,
                      category: undefined,
                    })}
                    className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 transition hover:bg-[#f8fafc]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={
                          active
                            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#10b981] bg-[#10b981] text-white"
                            : "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#e2e8f0]"
                        }
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span
                        className={
                          active
                            ? "truncate text-sm font-semibold text-[#061d31]"
                            : "truncate text-sm font-medium text-[#43474c]"
                        }
                      >
                        {item.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-[#74777d]">
                      {item.productCount.toLocaleString("en-US")}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <div>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
              Sort
            </h3>
            <div className="space-y-1">
              {sortOptions.map(({ value, label, Icon }) => {
                const active = current.sort === value
                return (
                  <Link
                    key={value}
                    href={filterHref({ sort: active ? undefined : value })}
                    className={
                      active
                        ? "flex items-center gap-3 rounded-md bg-[#10b981]/10 p-2 text-sm font-bold text-[#047857]"
                        : "flex items-center gap-3 rounded-md p-2 text-sm font-medium text-[#43474c] transition hover:bg-[#f8fafc] hover:text-[#061d31]"
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <div>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
              Status
            </h3>
            <Link
              href={filterHref({
                verified: current.verified ? undefined : "true",
              })}
              className={
                current.verified
                  ? "flex items-center gap-3 rounded-md bg-[#eff6ff] p-2 text-sm font-bold text-[#0051d5]"
                  : "flex items-center gap-3 rounded-md p-2 text-sm font-medium text-[#43474c] transition hover:bg-[#f8fafc] hover:text-[#061d31]"
              }
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Verified makers
            </Link>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
              <Tags className="h-4 w-4 text-[#10b981]" aria-hidden />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {tagLinks.map((item) => (
                <Link
                  key={item.slug}
                  href={tagPath(item.slug)}
                  className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-[10px] font-bold uppercase text-[#43474c] transition hover:border-[#10b981] hover:text-[#047857]"
                >
                  #{item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </aside>
  )
}
