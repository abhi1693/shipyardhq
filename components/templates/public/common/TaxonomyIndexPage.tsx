import type { ReactNode } from "react"
import Link from "next/link"
import { BarChart3, ChevronRight, Hash, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

export type TaxonomyIndexItem = {
  key: string
  title: string
  description?: string | null
  href: string
  count: number
  icon?: ReactNode
  momentum?: number
  tone?: "blue" | "green" | "orange" | "neutral"
}

type TaxonomyIndexStat = {
  label: string
  value: string
}

type TaxonomyIndexPageProps = {
  title: string
  description: string
  searchPlaceholder?: string
  itemsHeading: string
  items: TaxonomyIndexItem[]
  totalItems?: number
  itemUnit?: string
  trendingItems?: TaxonomyIndexItem[]
  trendingWindowLabel?: string
  pulseTitle?: string
  pulseStats?: TaxonomyIndexStat[]
  quickLinksTitle?: string
  emptyTitle?: string
  emptyDescription?: string
  structuredData?: ReactNode
  directoryAccessory?: "sparkline" | "icon"
}

const toneClasses = {
  blue: {
    icon: "bg-[#eff6ff] text-[#0051d5]",
    badge: "text-[#0051d5]",
    spark: "bg-[#0051d5]/15",
  },
  green: {
    icon: "bg-[#eaf7ee] text-[#16a34a]",
    badge: "text-[#16a34a]",
    spark: "bg-[#16a34a]/15",
  },
  orange: {
    icon: "bg-[#fff3e8] text-[#f97316]",
    badge: "text-[#f97316]",
    spark: "bg-[#f97316]/15",
  },
  neutral: {
    icon: "bg-[#eff4ff] text-[#0b1c30]",
    badge: "text-[#43474c]",
    spark: "bg-[#4c6077]/15",
  },
}

const sparklineShapes = [
  "polygon(0 100%, 14% 72%, 32% 82%, 50% 48%, 68% 58%, 84% 28%, 100% 18%, 100% 100%)",
  "polygon(0 100%, 16% 86%, 28% 68%, 44% 74%, 62% 44%, 78% 34%, 100% 12%, 100% 100%)",
  "polygon(0 100%, 18% 92%, 36% 78%, 52% 84%, 70% 62%, 86% 46%, 100% 38%, 100% 100%)",
]

const numberFormatter = new Intl.NumberFormat("en")

function formatCount(value: number) {
  return numberFormatter.format(Math.max(0, value))
}

function formatItemUnit(count: number, unit: string) {
  return count === 1 ? unit.replace(/s$/, "") : unit
}

function sortByCount(items: TaxonomyIndexItem[]) {
  return [...items].sort((a, b) => b.count - a.count)
}

function Sparkline({
  index,
  tone = "blue",
}: {
  index: number
  tone?: TaxonomyIndexItem["tone"]
}) {
  const toneClass = toneClasses[tone ?? "blue"].spark
  return (
    <div className="relative h-8 w-16 overflow-hidden rounded bg-[#f8faff]">
      <div
        className={cn("absolute inset-x-0 bottom-0 h-7", toneClass)}
        style={{
          clipPath: sparklineShapes[index % sparklineShapes.length],
        }}
      />
    </div>
  )
}

function TrendCard({
  item,
  index,
  itemUnit,
}: {
  item: TaxonomyIndexItem
  index: number
  itemUnit: string
}) {
  const tone =
    item.tone ??
    (index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange")
  const momentum = item.momentum ?? 4.2 + index * 2.1

  return (
    <Link
      href={item.href}
      className="group block rounded-xl border border-[#e2e8f0] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#0051d5]/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-lg",
            toneClasses[tone].icon,
          )}
        >
          {item.icon ?? <Hash className="h-5 w-5" aria-hidden />}
        </span>
        <span
          className={cn(
            "flex flex-col items-end text-xs font-semibold",
            toneClasses[tone].badge,
          )}
        >
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />+
            {momentum.toFixed(1)}%
          </span>
          <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-[#74777d]">
            momentum
          </span>
        </span>
      </div>
      <h3 className="text-lg font-semibold leading-6 text-[#0b1c30] transition-colors group-hover:text-[#0051d5]">
        {item.title}
      </h3>
      {item.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#43474c]">
          {item.description}
        </p>
      ) : null}
      <div className="mt-5 flex items-center justify-between border-t border-[#e2e8f0] pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#43474c]">
          {formatCount(item.count)} {formatItemUnit(item.count, itemUnit)}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5]">
          Explore
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

function DirectoryCard({
  item,
  index,
  itemUnit,
  accessory,
}: {
  item: TaxonomyIndexItem
  index: number
  itemUnit: string
  accessory: "sparkline" | "icon"
}) {
  const tone =
    item.tone ??
    (index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange")

  return (
    <Link
      href={item.href}
      className="group flex min-h-[88px] items-center justify-between gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4 transition-colors hover:border-[#0051d5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
    >
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold text-[#0b1c30] transition-colors group-hover:text-[#0051d5]">
          {item.title}
        </span>
        <span className="mt-1 block text-xs font-medium text-[#43474c]">
          {formatCount(item.count)} {formatItemUnit(item.count, itemUnit)}
        </span>
      </span>
      {accessory === "icon" ? (
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            toneClasses[tone].icon,
          )}
        >
          {item.icon ?? <Hash className="h-5 w-5" aria-hidden />}
        </span>
      ) : (
        <Sparkline index={index} tone={tone} />
      )}
    </Link>
  )
}

function PulsePanel({
  title,
  stats,
  topItems,
  totalProducts,
}: {
  title: string
  stats: TaxonomyIndexStat[]
  topItems: TaxonomyIndexItem[]
  totalProducts: number
}) {
  const maxCount = Math.max(...topItems.map((item) => item.count), 1)
  const hasMappedProductsStat = stats.some(
    (stat) => stat.label.toLowerCase() === "mapped products",
  )

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-[#0b1c30]">
        <BarChart3 className="h-5 w-5 text-[#0051d5]" aria-hidden />
        {title}
      </h2>
      <div className="mb-5 rounded-lg bg-[#f8faff] p-4">
        <div className="flex h-36 items-end gap-2">
          {topItems.slice(0, 8).map((item) => (
            <div
              key={item.key}
              className="min-h-2 flex-1 rounded-t bg-[#0051d5]/70"
              style={{
                height: `${Math.max(12, Math.round((item.count / maxCount) * 100))}%`,
              }}
              title={`${item.title}: ${formatCount(item.count)}`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex justify-between gap-4 text-sm leading-5"
          >
            <span className="text-[#43474c]">{stat.label}</span>
            <span className="font-semibold text-[#0b1c30]">{stat.value}</span>
          </div>
        ))}
        {!hasMappedProductsStat ? (
          <div className="flex justify-between gap-4 text-sm leading-5">
            <span className="text-[#43474c]">Mapped products</span>
            <span className="font-semibold text-[#0b1c30]">
              {formatCount(totalProducts)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function TaxonomyIndexPage({
  title,
  description,
  itemsHeading,
  items,
  totalItems,
  itemUnit = "products",
  trendingItems,
  trendingWindowLabel = "Last 7 days",
  pulseTitle = "Directory Pulse",
  pulseStats,
  quickLinksTitle = "Quick Shortcuts",
  emptyTitle = "Nothing to show yet",
  emptyDescription = "Once matching products are published, this directory will populate automatically.",
  structuredData,
  directoryAccessory = "sparkline",
}: TaxonomyIndexPageProps) {
  const sortedItems = sortByCount(items)
  const topItems = (trendingItems ?? sortedItems).slice(0, 4)
  const quickLinks = sortedItems.slice(0, 8)
  const totalProductCount = items.reduce((sum, item) => sum + item.count, 0)
  const stats = pulseStats ?? [
    {
      label: "Active directories",
      value: formatCount(totalItems ?? items.length),
    },
    {
      label: "Top directory",
      value: sortedItems[0]?.title ?? "No data",
    },
  ]

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0b1c30]">
      {structuredData}
      <section className="bg-[#061d31] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-10 tracking-tight md:text-5xl md:leading-[1.1]">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-6 text-[#d0e4ff]/80">
            {description}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          {topItems.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <TrendingUp className="h-5 w-5 text-[#f97316]" aria-hidden />
                  Trending Now
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#74777d]">
                  {trendingWindowLabel}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {topItems.map((item, index) => (
                  <TrendCard
                    key={item.key}
                    item={item}
                    index={index}
                    itemUnit={itemUnit}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <h2 className="text-lg font-semibold">{itemsHeading}</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#74777d]">
                {formatCount(totalItems ?? items.length)} total
              </span>
            </div>
            {items.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {items.map((item, index) => (
                  <DirectoryCard
                    key={item.key}
                    item={item}
                    index={index}
                    itemUnit={itemUnit}
                    accessory={directoryAccessory}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#c4c6cd] bg-white px-6 py-10 text-center">
                <h3 className="text-lg font-semibold">{emptyTitle}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#43474c]">
                  {emptyDescription}
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <PulsePanel
            title={pulseTitle}
            stats={stats}
            topItems={sortedItems}
            totalProducts={totalProductCount}
          />

          {quickLinks.length > 0 ? (
            <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#0b1c30]">
                {quickLinksTitle}
              </h2>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="rounded bg-[#f8faff] px-3 py-1.5 text-sm font-medium text-[#43474c] transition-colors hover:bg-[#0051d5]/10 hover:text-[#0051d5]"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
