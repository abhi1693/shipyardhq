"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  Clock3,
  ListFilter,
  Search,
  Tags,
  TrendingUp,
  Trophy,
} from "lucide-react"

import { GoogleAdsenseDisplayUnit } from "@/components/molecules/GoogleAdsenseUnit"
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
    query?: string
    platform?: string
    pricingModel?: string
    productType?: string
    minPrice?: number
    maxPrice?: number
    badge?: string
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

type FilterOption = {
  value: string
  label: string
}

const productTypeOptions: FilterOption[] = [
  { value: "saas", label: "SaaS" },
  { value: "browser-extension", label: "Browser extension" },
  { value: "mobile-app", label: "Mobile app" },
  { value: "desktop-app", label: "Desktop app" },
  { value: "api", label: "API" },
  { value: "open-source", label: "Open source" },
  { value: "other", label: "Other" },
]

const pricingOptions: FilterOption[] = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "subscription", label: "Subscription" },
  { value: "one-time", label: "One-time" },
  { value: "custom", label: "Custom" },
]

const platformOptions: FilterOption[] = [
  { value: "web", label: "Web" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "mac", label: "Mac" },
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "chrome", label: "Chrome extension" },
]

const badgeOptions: FilterOption[] = [
  { value: "featured", label: "Featured" },
  { value: "trending", label: "Trending" },
  { value: "new", label: "New Launch" },
  { value: "editor-pick", label: "Editor's Pick" },
  { value: "product-of-day-1", label: "Product of the Day #1" },
  { value: "product-of-day-2", label: "Product of the Day #2" },
  { value: "product-of-day-3", label: "Product of the Day #3" },
  { value: "product-of-week-1", label: "Product of the Week #1" },
  { value: "product-of-week-2", label: "Product of the Week #2" },
  { value: "product-of-week-3", label: "Product of the Week #3" },
  { value: "product-of-month-1", label: "Product of the Month #1" },
  { value: "product-of-month-2", label: "Product of the Month #2" },
  { value: "product-of-month-3", label: "Product of the Month #3" },
]

type FilterHrefBuilder = (
  updates: Record<string, string | undefined | null | false>,
) => string

const PRICE_MIN = 0
const PRICE_MAX = 500
const PRICE_STEP = 5

function formatPrice(value: number) {
  return value >= PRICE_MAX ? "$500+" : `$${value}`
}

function FilterOptionSection({
  title,
  options,
  activeValue,
  paramName,
  filterHref,
  navigate,
  searchPlaceholder,
  getUpdates,
}: {
  title: string
  options: FilterOption[]
  activeValue?: string
  paramName: string
  filterHref: FilterHrefBuilder
  navigate: (href: string) => void
  searchPlaceholder: string
  getUpdates?: (
    item: FilterOption,
    active: boolean,
  ) => Record<string, string | undefined | null | false>
}) {
  const [query, setQuery] = useState("")
  const searchable = options.length > 6
  const needle = query.trim().toLowerCase()
  const filteredOptions = searchable
    ? options.filter((item) => item.label.toLowerCase().includes(needle))
    : options

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
          {title}
        </h3>
      </div>
      {searchable ? (
        <label className="relative block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474c]"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-md border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 text-sm focus:border-[#10b981] focus:ring-[#10b981]"
            placeholder={searchPlaceholder}
            type="search"
          />
        </label>
      ) : null}
      <div
        className={
          searchable
            ? "mt-3 max-h-56 space-y-2 overflow-y-auto pr-1"
            : "space-y-2"
        }
      >
        {filteredOptions.map((item) => {
          const active = activeValue === item.value
          const href = filterHref({
            [paramName]: active ? undefined : item.value,
            ...getUpdates?.(item, active),
          })
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => navigate(href)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left transition hover:bg-[#f8fafc]"
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PriceRangeSelector({
  minPrice,
  maxPrice,
  filterHref,
  disabled = false,
}: {
  minPrice?: number
  maxPrice?: number
  filterHref: FilterHrefBuilder
  disabled?: boolean
}) {
  const router = useRouter()
  const normalizedMin = minPrice ?? PRICE_MIN
  const normalizedMax = maxPrice ?? PRICE_MAX
  const [localMin, setLocalMin] = useState(normalizedMin)
  const [localMax, setLocalMax] = useState(normalizedMax)
  const minPercent = ((localMin - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100
  const maxPercent = ((localMax - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100

  const clearHref = filterHref({
    minPrice: undefined,
    maxPrice: undefined,
    priceRange: undefined,
  })
  const active = minPrice !== undefined || maxPrice !== undefined
  const preserveSliderPosition = (anchorTop: number | null) => {
    if (anchorTop === null) return

    const restore = () => {
      const slider = document.getElementById("browse-min-price")
      if (!slider) return
      const nextTop = slider.getBoundingClientRect().top
      const delta = nextTop - anchorTop
      if (Math.abs(delta) > 1) {
        window.scrollBy(0, delta)
      }
    }

    window.requestAnimationFrame(restore)
    window.setTimeout(restore, 80)
    window.setTimeout(restore, 240)
    window.setTimeout(restore, 600)
    window.setTimeout(restore, 1000)
  }
  const commitRange = (nextMin: number, nextMax: number) => {
    if (disabled) return

    const anchorTop =
      document.getElementById("browse-min-price")?.getBoundingClientRect()
        .top ?? null

    router.replace(
      filterHref({
        minPrice: nextMin > PRICE_MIN ? String(nextMin) : undefined,
        maxPrice: nextMax < PRICE_MAX ? String(nextMax) : undefined,
        priceRange: undefined,
      }),
      { scroll: false },
    )
    preserveSliderPosition(anchorTop)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
          Price Range
        </h3>
        <span className="text-xs font-bold text-[#061d31]">
          {disabled
            ? "Free only"
            : `${formatPrice(localMin)} - ${formatPrice(localMax)}`}
        </span>
      </div>

      <div className={disabled ? "opacity-50" : undefined}>
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[#43474c]">
          <span>Min {formatPrice(localMin)}</span>
          <span>Max {formatPrice(localMax)}</span>
        </div>

        <div className="relative h-7">
          <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#e2e8f0]" />
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#10b981]"
            style={{
              left: `${minPercent}%`,
              right: `${100 - maxPercent}%`,
            }}
          />
          <label className="sr-only" htmlFor="browse-min-price">
            Minimum price
          </label>
          <input
            id="browse-min-price"
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={localMin}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value)
              setLocalMin(Math.min(next, localMax - PRICE_STEP))
            }}
            onPointerUp={(event) =>
              commitRange(
                Math.min(
                  Number(event.currentTarget.value),
                  localMax - PRICE_STEP,
                ),
                localMax,
              )
            }
            onKeyUp={(event) =>
              commitRange(
                Math.min(
                  Number(event.currentTarget.value),
                  localMax - PRICE_STEP,
                ),
                localMax,
              )
            }
            onBlur={(event) =>
              commitRange(
                Math.min(
                  Number(event.currentTarget.value),
                  localMax - PRICE_STEP,
                ),
                localMax,
              )
            }
            className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-6 w-full -translate-y-1/2 appearance-none bg-transparent disabled:cursor-not-allowed [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#10b981] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#10b981] [&::-webkit-slider-thumb]:shadow-md"
          />
          <label className="sr-only" htmlFor="browse-max-price">
            Maximum price
          </label>
          <input
            id="browse-max-price"
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={localMax}
            disabled={disabled}
            onChange={(event) => {
              const next = Number(event.target.value)
              setLocalMax(Math.max(next, localMin + PRICE_STEP))
            }}
            onPointerUp={(event) =>
              commitRange(
                localMin,
                Math.max(
                  Number(event.currentTarget.value),
                  localMin + PRICE_STEP,
                ),
              )
            }
            onKeyUp={(event) =>
              commitRange(
                localMin,
                Math.max(
                  Number(event.currentTarget.value),
                  localMin + PRICE_STEP,
                ),
              )
            }
            onBlur={(event) =>
              commitRange(
                localMin,
                Math.max(
                  Number(event.currentTarget.value),
                  localMin + PRICE_STEP,
                ),
              )
            }
            className="pointer-events-none absolute inset-x-0 top-1/2 z-30 h-6 w-full -translate-y-1/2 appearance-none bg-transparent disabled:cursor-not-allowed [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#10b981] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#10b981] [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>

        {active && !disabled ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => router.replace(clearHref, { scroll: false })}
              className="text-xs font-bold text-[#0051d5] underline-offset-4 hover:underline"
            >
              Clear
            </button>
          </div>
        ) : null}
        {disabled ? (
          <p className="mt-2 text-[11px] font-medium text-[#43474c]">
            Price range is disabled for free products.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function BrowseDiscoveryFilters({
  categories,
  useCases,
  current,
  hasActiveFilters,
}: BrowseDiscoveryFiltersProps) {
  const router = useRouter()
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
  const navigate = (href: string) => router.push(href, { scroll: false })

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
            <div className="mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
                Categories
              </h3>
            </div>
            <label className="relative block">
              <span className="sr-only">Search categories</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474c]"
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
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      navigate(
                        filterHref({
                          category: active ? undefined : item.slug,
                          useCase: undefined,
                        }),
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left transition hover:bg-[#f8fafc]"
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
                    <span className="shrink-0 text-[10px] font-bold text-[#43474c]">
                      {count.toLocaleString("en-US")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <div>
            <div className="mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
                Use Cases
              </h3>
            </div>
            <label className="relative block">
              <span className="sr-only">Search use cases</span>
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#43474c]"
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
            <div
              className={
                useCases.length > 6
                  ? "mt-3 max-h-56 space-y-2 overflow-y-auto pr-1"
                  : "mt-3 space-y-2"
              }
            >
              {filteredUseCases.map((item) => {
                const active = current.useCase === item.slug
                return (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      navigate(
                        filterHref({
                          useCase: active ? undefined : item.slug,
                          category: undefined,
                        }),
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left transition hover:bg-[#f8fafc]"
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
                    <span className="shrink-0 text-[10px] font-bold text-[#43474c]">
                      {item.productCount.toLocaleString("en-US")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <FilterOptionSection
            title="Product Type"
            options={productTypeOptions}
            activeValue={current.productType}
            paramName="productType"
            filterHref={filterHref}
            navigate={navigate}
            searchPlaceholder="Search product types..."
          />

          <div className="h-px bg-[#e2e8f0]" />

          <FilterOptionSection
            title="Pricing"
            options={pricingOptions}
            activeValue={current.pricingModel}
            paramName="pricingModel"
            filterHref={filterHref}
            navigate={navigate}
            searchPlaceholder="Search pricing..."
            getUpdates={(item, active) =>
              item.value === "free" && !active
                ? { minPrice: undefined, maxPrice: undefined }
                : {}
            }
          />

          <div className="h-px bg-[#e2e8f0]" />

          <PriceRangeSelector
            key={`${current.minPrice ?? "min"}-${current.maxPrice ?? "max"}`}
            minPrice={current.minPrice}
            maxPrice={current.maxPrice}
            filterHref={filterHref}
            disabled={current.pricingModel === "free"}
          />

          <div className="h-px bg-[#e2e8f0]" />

          <FilterOptionSection
            title="Platform"
            options={platformOptions}
            activeValue={current.platform}
            paramName="platform"
            filterHref={filterHref}
            navigate={navigate}
            searchPlaceholder="Search platforms..."
          />

          <div>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#43474c]">
              Sort
            </h3>
            <div className="space-y-1">
              {sortOptions.map(({ value, label, Icon }) => {
                const active = current.sort === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      navigate(filterHref({ sort: active ? undefined : value }))
                    }
                    className={
                      active
                        ? "flex w-full items-center gap-3 rounded-md bg-[#10b981]/10 p-2 text-left text-sm font-bold text-[#047857]"
                        : "flex w-full items-center gap-3 rounded-md p-2 text-left text-sm font-medium text-[#43474c] transition hover:bg-[#f8fafc] hover:text-[#061d31]"
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[#e2e8f0]" />

          <FilterOptionSection
            title="Badge"
            options={badgeOptions}
            activeValue={current.badge}
            paramName="badge"
            filterHref={filterHref}
            navigate={navigate}
            searchPlaceholder="Search badges..."
          />

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
      <GoogleAdsenseDisplayUnit />
    </aside>
  )
}
