import {
  getLeaderboardStats,
  getTopRankedProducts,
} from "@/actions/public/leaderboard/actions"
import Link from "next/link"
import type { ComponentType } from "react"
export const revalidate = 60

import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import PublicContainer from "@/components/layout/PublicContainer"
import { ProductCompactGrid } from "@/components/molecules/ProductCompactGrid"
import Medal from "@/components/atoms/Medal"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { LeaderboardFilters } from "./filters"
import { cn } from "@/lib/utils"
import {
  IconAnchor,
  IconPackage,
  IconThumbUp,
  IconUsers,
  IconTrophy,
} from "@tabler/icons-react"
import type { IconProps } from "@tabler/icons-react"
import Image from "next/image"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Product Leaderboard",
  description: "See the most upvoted products across the platform.",
})

type CategoryListItem = Awaited<
  ReturnType<typeof getCategoriesWithCounts>
>[number]
type LeaderboardProduct = Awaited<
  ReturnType<typeof getTopRankedProducts>
>[number]

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; limit?: string }>
}) {
  const sp = await searchParams
  const limit = Number(sp?.limit || 50)
  const categorySlug = sp?.category || undefined

  const [stats, categories, products] = await Promise.all([
    getLeaderboardStats(),
    getCategoriesWithCounts(),
    getTopRankedProducts({ limit, categorySlug }),
  ])
  const topThree = products.slice(0, 3)
  const rest = products.slice(3)
  const categoryName = categorySlug
    ? categories.find((c: CategoryListItem) => c.slug === categorySlug)?.name
    : undefined
  const totalCount = products.length
  const restHasEntries = rest.length > 0
  const rankLabels = ["Flagship", "First Mate", "Deckhand"]

  return (
    <main className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_80%_at_0%_0%,var(--brand-2)/0.12,transparent_62%),radial-gradient(110%_120%_at_100%_10%,var(--brand-3)/0.14,transparent_74%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "160px 160px",
          maskImage:
            "radial-gradient(80% 110% at 50% 0%, rgba(0,0,0,0.9), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
            Leaderboard
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Meet the fleet leading the tide
            </h1>
            <p className="text-lg text-muted-foreground">
              Track the products charting the strongest course by community
              upvotes. Filter by category and watch who holds the top deck.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)]"
            >
              <Link href="/member/products">Submit your product</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)]"
            >
              <Link href="/pricing">Boost with featured slots</Link>
            </Button>
          </div>

          <div className="grid gap-4 rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/80 px-6 py-6 text-left shadow-[0px_25px_60px_-40px_rgba(7,58,104,0.6)] backdrop-blur sm:grid-cols-4">
            <HeroStat
              icon={IconPackage}
              label="Products competing"
              value={stats.totalProducts}
            />
            <HeroStat
              icon={IconThumbUp}
              label="Community upvotes"
              value={stats.totalUpvotes}
            />
            <HeroStat
              icon={IconUsers}
              label="Active makers"
              value={stats.totalCreators}
            />
            <HeroStat
              icon={IconTrophy}
              label="High score"
              value={stats.topScore}
            />
          </div>
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-12"
        fillScreen={false}
        className="relative"
      >
        <div className="rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/85 px-6 py-6 shadow-[0px_25px_70px_-45px_rgba(7,58,104,0.55)] backdrop-blur">
          <LeaderboardFilters
            categories={categories}
            selected={categorySlug}
            limit={limit}
          />
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing top {totalCount} launch{totalCount === 1 ? "" : "es"}
              {categoryName ? ` in ${categoryName}` : " across all categories"}.
            </span>
            {categorySlug || limit !== 50 ? (
              <Link
                href="/leaderboard"
                className="inline-flex items-center font-semibold text-[color:var(--brand-1)] hover:underline"
              >
                Reset filters
              </Link>
            ) : null}
          </div>
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-10"
        fillScreen={false}
        className="relative"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {topThree.map((product: LeaderboardProduct, index: number) => (
            <TopPlacementCard
              key={product.id}
              product={product}
              rank={index + 1}
              label={rankLabels[index] ?? `Top ${index + 1}`}
              className={cn(
                index === 0 && "lg:col-span-2",
                topThree.length < 3 && index === 0 && "lg:col-span-3",
              )}
            />
          ))}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-12"
        fillScreen={false}
        className="relative"
      >
        <div className="rounded-3xl border border-[color:var(--brand-1)/0.16] bg-background/90 px-5 py-6 shadow-[0px_28px_80px_-55px_rgba(7,58,104,0.6)] backdrop-blur">
          {restHasEntries ? (
            <ProductCompactGrid
              items={rest.map((p: LeaderboardProduct) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                logo: p.logo,
                tagline: p.tagline,
                analytics: p.analytics ?? null,
                category: p.category ?? undefined,
              }))}
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              className="gap-y-6"
              renderMeta={(_, index: number) => (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  #{topThree.length + index + 1}
                </Badge>
              )}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-12 text-center text-muted-foreground">
              <IconAnchor className="h-8 w-8 text-[color:var(--brand-1)]" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No additional contenders yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Invite your crew or explore another category to discover more
                  launches.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)]"
              >
                <Link href="/browse">Browse products</Link>
              </Button>
            </div>
          )}
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Ready to climb the leaderboard?
          </h2>
          <p className="text-muted-foreground">
            Launch your product, rally the crew, and claim a spot among the top
            makers. We’ll help chart the course.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/browse">Explore the fleet</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)]"
            >
              <Link href="/pricing">See promotion options</Link>
            </Button>
          </div>
        </div>
      </PublicContainer>
    </main>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<IconProps>
  label: string
  value: number
}) {
  return (
    <div className="space-y-2">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-semibold text-foreground">
        {value.toLocaleString()}
      </div>
      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

type RankedProduct = Awaited<ReturnType<typeof getTopRankedProducts>>[number]

function TopPlacementCard({
  product,
  rank,
  label,
  className,
}: {
  product: RankedProduct
  rank: number
  label: string
  className?: string
}) {
  const upvotes = product.analytics?.upvotes ?? 0
  const authorName =
    `${product.user.firstName ?? ""} ${product.user.lastName ?? ""}`.trim() ||
    "Unknown maker"
  const categoryName = product.category?.name ?? ""
  const gradients = [
    "linear-gradient(140deg, rgba(7, 58, 104, 0.22) 0%, rgba(7, 58, 104, 0.05) 65%)",
    "linear-gradient(140deg, rgba(6, 47, 90, 0.18) 0%, rgba(6, 47, 90, 0.04) 70%)",
    "linear-gradient(140deg, rgba(5, 40, 76, 0.16) 0%, rgba(5, 40, 76, 0.04) 72%)",
  ]

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border border-[color:var(--brand-1)/0.2] bg-background/92 p-6 shadow-[0px_28px_70px_-48px_rgba(7,58,104,0.6)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_32px_90px_-60px_rgba(7,78,134,0.55)]",
        className,
      )}
      style={{ backgroundImage: gradients[(rank - 1) % gradients.length] }}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
        <span className="inline-flex items-center gap-2">
          <Medal rank={Math.min(rank, 3) as 1 | 2 | 3} />
          {label}
        </span>
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <IconAnchor className="h-4 w-4" />
          Rank #{rank}
        </span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.25] bg-background/75">
            {product.logo ? (
              <Image
                src={product.logo}
                alt={product.name}
                width={64}
                height={64}
                className="h-16 w-16 object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-[color:var(--brand-1)]">
                {product.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                {product.name}
              </p>
              {categoryName ? (
                <span className="inline-flex items-center rounded-full border border-[color:var(--brand-1)/0.3] bg-background/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                  {categoryName}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.tagline}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 text-right sm:items-end">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Upvotes
          </span>
          <span className="text-2xl font-semibold text-[color:var(--brand-1)]">
            {upvotes.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            Captained by {authorName}
          </span>
        </div>
      </div>
    </Link>
  )
}
