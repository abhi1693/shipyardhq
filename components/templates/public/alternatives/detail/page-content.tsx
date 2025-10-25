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
import { ALTERNATIVES_PATH, alternativePath, productPath } from "@/lib/routes"
import { brandGradient } from "@/lib/ui/tints"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/siteConfig"

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
  const currentYear = new Date().getFullYear()

  const seoKeywords = [
    `best ${alternative.name} alternatives`,
    `top ${alternative.name} competitors`,
    `tools like ${alternative.name}`,
    `${alternative.name} replacement software`,
    `${alternative.name} alternative platforms`,
    `${alternative.name} similar products ${currentYear}`,
  ]

  const alternativeUrl = new URL(
    alternativePath(alternative.slug),
    siteConfig.url,
  ).toString()

  const itemListElements = productsPage.items.map((product, index) => {
    const productUrl = new URL(productPath(product.slug), siteConfig.url)
      .toString()

    const productNode: Record<string, unknown> = {
      "@type": "Product",
      name: product.name,
      url: productUrl,
    }

    if (product.logo) {
      productNode.image = product.logo
    }

    const categoryName = product.category?.name
    if (categoryName) {
      productNode.category = categoryName
    }

    if (product.tagline) {
      productNode.description = product.tagline
    }

    return {
      "@type": "ListItem",
      position: index + 1,
      url: productUrl,
      item: productNode,
    }
  })

  const structuredDescription = hasProducts
    ? `Compare the top ${productsPage.total} ${alternative.name} alternatives, competitors, and similar tools Shipyard makers rely on in ${currentYear}.`
    : `Explore curated ${alternative.name} competitors, similar tools, and replacement platforms updated for ${currentYear}.`

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hasProducts
      ? `Top ${productsPage.total} ${alternative.name} Alternatives & Competitors`
      : `Best ${alternative.name} Alternatives & Competitors`,
    url: alternativeUrl,
    description: structuredDescription,
    inLanguage: "en-US",
    keywords: seoKeywords.join(", "),
    alternateName: `Best ${alternative.name} alternatives and competitors`,
    about: {
      "@type": "Product",
      name: alternative.name,
      ...(websiteUrl ? { url: websiteUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: new URL(siteConfig.ogImage, siteConfig.url).toString(),
      },
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntityOfPage: alternativeUrl,
    dateModified: new Date().toISOString(),
    mainEntity: {
      "@type": "ItemList",
      name: `Products like ${alternative.name}`,
      numberOfItems: productsPage.total,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: itemListElements,
    },
  }

  const structuredDataJson = JSON.stringify(structuredData)

  const alternativesDirectoryUrl = new URL(ALTERNATIVES_PATH, siteConfig.url)
    .toString()

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "SaaS Alternatives Directory",
        item: alternativesDirectoryUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${alternative.name} Alternatives`,
        item: alternativeUrl,
      },
    ],
  }

  const breadcrumbJson = JSON.stringify(breadcrumbData)

  return (
    <main className="relative isolate bg-white">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: structuredDataJson,
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: breadcrumbJson,
        }}
      />
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
