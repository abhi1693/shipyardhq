import Link from "next/link"
import { notFound } from "next/navigation"

import {
  ALTERNATIVE_DETAIL_PAGE_SIZE,
  getAlternativeDetail,
  getAlternativeProductsPage,
  getFeaturedAlternatives,
} from "@/actions/public/alternatives/actions"
import AlternativeProductsClient from "@/app/(public)/alternatives/[slug]/AlternativeProductsClient"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/atoms/avatar"
import { EmptyState } from "@/components/molecules/empty-state"
import { AlternativeCatalogCard } from "@/components/molecules/AlternativeCatalogCard"
import { brandGradient } from "@/lib/ui/tints"
import { cn } from "@/lib/utils"

interface AlternativeDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function AlternativeDetailPageContent({
  params,
}: AlternativeDetailPageProps) {
  const { slug } = await params

  const alternative = await getAlternativeDetail(slug)
  if (!alternative) {
    notFound()
  }

  const productsPage = await getAlternativeProductsPage({
    alternativeId: alternative.id,
    page: 1,
    pageSize: ALTERNATIVE_DETAIL_PAGE_SIZE,
  })

  const featuredAlternatives = await getFeaturedAlternatives({
    excludeId: alternative.id,
    take: 6,
  })

  const curatedCount = productsPage.total > 0
    ? Math.min(productsPage.total, 8)
    : 0

  const subheading = curatedCount
    ? `A curated collection of the ${curatedCount} best alternatives to ${alternative.name}.`
    : `We're curating the best alternatives to ${alternative.name}.`

  const hasProducts = productsPage.items.length > 0
  const hasFeaturedAlternatives = featuredAlternatives.length > 0
  const avatarInitials = getInitials(alternative.name)
  const websiteUrl = alternative.websiteUrl?.trim()

  return (
    <main className="relative isolate bg-white">
      <div className="mx-auto w-full max-w-[120rem] px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="space-y-14">
          <section
            className={brandGradient(
              "relative overflow-hidden rounded-3xl border border-border px-6 py-16 shadow-sm sm:px-10",
            )}
          >
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
              <Avatar className="h-20 w-20 border border-white/30 bg-white/20 shadow-inner">
                {alternative.logoUrl ? (
                  <AvatarImage
                    src={alternative.logoUrl}
                    alt={`${alternative.name} logo`}
                  />
                ) : (
                  <AvatarFallback className="text-lg font-semibold uppercase tracking-wide text-white">
                    {avatarInitials}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Alternatives
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Best {alternative.name} Alternatives
                </h1>
              </div>

              <p className="max-w-xl text-base text-white/85 sm:text-lg">
                {subheading}
              </p>

              {alternative.description ? (
                <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                  {alternative.description}
                </p>
              ) : null}

              {websiteUrl ? (
                <Link
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition",
                    "hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  )}
                >
                  Visit {alternative.name}
                </Link>
              ) : null}

            </div>
          </section>

          <section className="space-y-6 rounded-3xl border border-border bg-white px-4 py-8 shadow-sm sm:px-6 lg:px-8">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Products like {alternative.name}
                </h2>
                <p className="text-sm text-slate-600">
                  {productsPage.total} product
                  {productsPage.total === 1 ? "" : "s"} positioned as
                  alternative{productsPage.total === 1 ? "" : "s"} to {alternative.name}.
                </p>
              </div>
            </header>

            {hasProducts ? (
              <AlternativeProductsClient
                alternativeId={alternative.id}
                initialItems={productsPage.items}
                initialHasMore={productsPage.hasMore}
                initialPage={productsPage.nextPage ?? 2}
                pageSize={ALTERNATIVE_DETAIL_PAGE_SIZE}
              />
            ) : (
              <EmptyState
                title="No linked alternatives yet"
                description={`Products will appear here once Shipyard launches are mapped as alternatives to ${alternative.name}.`}
              />
            )}
          </section>

          {hasFeaturedAlternatives ? (
            <section className="space-y-6 rounded-3xl border border-border bg-white px-4 py-8 shadow-sm sm:px-6 lg:px-8">
              <header className="space-y-1">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Featured alternatives
                </h2>
                <p className="text-sm text-slate-600">
                  Explore other vetted alternatives in the Shipyard library.
                </p>
              </header>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredAlternatives.map((featured) => (
                  <AlternativeCatalogCard
                    key={featured.id}
                    alternative={featured}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}

function getInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  return letters || "ALT"
}

function cleanHost(url: string) {
  try {
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}
