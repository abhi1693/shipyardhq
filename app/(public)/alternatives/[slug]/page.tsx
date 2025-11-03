import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { notFound } from "next/navigation"

import {
  ALTERNATIVE_DETAIL_PAGE_SIZE,
  getAlternativeDetail,
  getAlternativeProductsPage,
  getFeaturedAlternatives,
} from "@/actions/public/alternatives/actions"
import AlternativeProductsClient from "@/app/(public)/alternatives/[slug]/AlternativeProductsClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { EmptyState } from "@/components/molecules/empty-state"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"
import { StickyBanner } from "@/components/organisms/StickyBanner"
import {
  ProductUpdatesSection,
  ProductUpdatesSkeleton,
} from "@/components/templates/public/homepage/product-updates"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import { getAlternativeStaticParams } from "@/lib/alternatives/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import {
  ALTERNATIVES_PATH,
  BROWSE_PATH,
  MEMBER_PRODUCTS_PATH,
  alternativePath,
  productPath,
} from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"
import { cn } from "@/lib/utils"

export const dynamic = "force-static"
export const revalidate = 300
export const generateStaticParams = getAlternativeStaticParams

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const alternative = await getAlternativeDetail(slug)

  if (!alternative) {
    return {}
  }

  const productsSummary = await getAlternativeProductsPage({
    alternativeId: alternative.id,
    page: 1,
    pageSize: 1,
  })

  const linkedCount = productsSummary.total
  const currentYear = new Date().getFullYear()
  const title =
    linkedCount > 0
      ? `Top ${linkedCount} ${alternative.name} Alternatives & Competitors in ${currentYear}`
      : `Best ${alternative.name} Alternatives & Competitors in ${currentYear}`

  const description = alternative.description?.trim().length
    ? alternative.description
    : linkedCount > 0
      ? `Discover the top ${linkedCount} ${alternative.name} competitors, similar tools, and replacement options trusted by Shipyard founders in ${currentYear}.`
      : `Discover the best ${alternative.name} competitors, similar tools, and replacement options trusted by Shipyard founders in ${currentYear}.`

  const keywordPhrases = [
    `best ${alternative.name} alternatives`,
    `${alternative.name} competitors`,
    `top tools like ${alternative.name}`,
    `${alternative.name} replacement software`,
    `${alternative.name} alternative platforms`,
    `${alternative.name} competitor comparison ${currentYear}`,
  ]

  const metadata = buildPageMetadata({
    title,
    description,
    section: "Alternatives",
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  })

  return {
    ...metadata,
    keywords: keywordPhrases,
  }
}

interface AlternativeDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function AlternativeDetailPage({
  params,
}: AlternativeDetailPageProps) {
  const { slug } = await params

  const alternative = await getAlternativeDetail(slug)
  if (!alternative) {
    notFound()
  }

  const [productsPage, featuredAlternatives] = await Promise.all([
    getAlternativeProductsPage({
      alternativeId: alternative.id,
      page: 1,
      pageSize: ALTERNATIVE_DETAIL_PAGE_SIZE,
    }),
    getFeaturedAlternatives({
      excludeId: alternative.id,
      take: 6,
    }),
  ])

  const curatedCount =
    productsPage.total > 0 ? Math.min(productsPage.total, 8) : 0

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
    const productUrl = new URL(
      productPath(product.slug),
      siteConfig.url,
    ).toString()

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

  const alternativesDirectoryUrl = new URL(
    ALTERNATIVES_PATH,
    siteConfig.url,
  ).toString()

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
    <main className="relative isolate bg-[#f5f7fb]">
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
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="space-y-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
                <Avatar className="h-20 w-20 border border-border/50 bg-muted/30 shadow-[0_18px_42px_-28px_rgba(7,68,134,0.35)]">
                  {alternative.logoUrl ? (
                    <AvatarImage
                      src={alternative.logoUrl}
                      alt={`${alternative.name} logo`}
                    />
                  ) : (
                    <AvatarFallback className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">
                      {avatarInitials}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Alternatives
                    </p>
                    <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                      Best {alternative.name} alternatives
                    </h1>
                  </div>
                  <p className="text-base text-muted-foreground sm:text-lg">
                    {subheading}
                  </p>
                  {alternative.description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground/90 sm:text-base">
                      {alternative.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={cn(
                      HERO_PRIMARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Submit your alternative
                  </Link>
                  <Link
                    href={BROWSE_PATH}
                    className={cn(
                      HERO_SECONDARY_BUTTON_CLASSES,
                      "w-full justify-center sm:w-auto",
                    )}
                  >
                    Browse the directory
                  </Link>
                </div>

                {websiteUrl ? (
                  <Link
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-primary transition hover:text-primary/80"
                  >
                    Visit {alternative.name}
                  </Link>
                ) : null}
              </div>
            </section>

            <StickyBanner className="mx-auto w-full rounded-2xl" />

            <section className="space-y-6">
              <header className="space-y-1 text-left">
                <h2 className="text-2xl font-semibold text-foreground">
                  Products like {alternative.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {productsPage.total} product
                  {productsPage.total === 1 ? "" : "s"} mapped as alternatives to{" "}
                  {alternative.name}.
                </p>
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
              <section className="space-y-6 rounded-3xl border border-border/40 bg-white px-6 py-8 shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)]">
                <header className="space-y-2 text-left">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Featured alternatives
                  </h2>
                </header>

                <ul className="divide-y divide-border/60 border-y border-border/60">
                  {featuredAlternatives.map((featured) => {
                    const count = featured._count.products
                    const countLabel = `${count.toLocaleString()} product${count === 1 ? "" : "s"}`

                    return (
                      <li key={featured.id}>
                        <Link
                          href={alternativePath(featured.slug)}
                          className="flex flex-col gap-2 px-4 py-4 transition hover:bg-muted/40 hover:text-primary"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-base font-semibold text-foreground">
                              {featured.name}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {countLabel}
                            </span>
                          </div>
                          {featured.description ? (
                            <p className="text-sm text-muted-foreground">
                              {featured.description}
                            </p>
                          ) : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              <SponsoredProductsSection />
            </Suspense>
            <Suspense fallback={<ProductUpdatesSkeleton />}>
              <ProductUpdatesSection />
            </Suspense>
          </>
        }
      />
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
